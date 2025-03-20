const xlsx = require('xlsx');
const Paper = require('../models/Paper');

const TIME_SLOTS = [
  '09:00 - 09:30', '09:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00',
  '11:20 - 11:50', '11:50 - 12:20', '12:20 - 12:50', '12:50 - 13:20',
  '14:00 - 14:30', '14:30 - 15:00', '15:00 - 15:30', '15:30 - 16:00'
];

// Constants
const PAPERS_PER_ROOM = 12;
const MAX_ROOMS_PER_DOMAIN = 10;

// Domain abbreviations mapping
const DOMAIN_CODES = {
  'Cognitive Systems, Vision and Perception': 'CSVP',
  'Cyber Security': 'CS',
  'Advancements in 5g and its applications': '5G',
  'Advancements in blockchain for secure transactions': 'BC',
  'Artificial Intelligence and Machine Learning': 'AIML',
  'Internet of Things and its Applications': 'IOT',
  'Cloud Computing and Virtualization': 'CC',
  'Big Data Analytics': 'BDA'
};

// Generate room names for each domain
const generateRoomName = (domain, roomNumber) => {
  const domainCode = DOMAIN_CODES[domain] || domain.split(' ').map(word => word[0]).join('').toUpperCase();
  return `${domainCode}-R${String(roomNumber).padStart(2, '0')}`;
};

const generateTeamId = (domain, index) => {
  const domainCode = DOMAIN_CODES[domain] || domain.split(' ').map(word => word[0]).join('').toUpperCase();
  return `${domainCode}${String(index + 1).padStart(3, '0')}`;
};

const isDuplicatePaper = (paper, existingPapers, newPapers) => {
  // Check for duplicate title
  const titleDuplicate = [...existingPapers, ...newPapers].some(
    p => p.title.toLowerCase() === paper.title.toLowerCase() && p !== paper
  );
  if (titleDuplicate) {
    return { isDuplicate: true, reason: `Paper with title "${paper.title}" already exists` };
  }

  // Check for duplicate presenters (if any presenter is already presenting another paper)
  const presenterEmails = paper.presenters.map(p => p.email.toLowerCase());
  const duplicatePresenter = [...existingPapers, ...newPapers].some(p => {
    if (p === paper) return false;
    return p.presenters.some(presenter => 
      presenterEmails.includes(presenter.email.toLowerCase())
    );
  });

  if (duplicatePresenter) {
    return { 
      isDuplicate: true, 
      reason: `One or more presenters (${presenterEmails.join(', ')}) are already presenting another paper` 
    };
  }

  return { isDuplicate: false };
};

const parseDate = (dateValue) => {
  if (!dateValue) return null;
  
  // If it's already a Date object
  if (dateValue instanceof Date && !isNaN(dateValue)) {
    return dateValue;
  }

  // If it's a number (Excel serial date)
  if (typeof dateValue === 'number') {
    const date = xlsx.SSF.parse_date_code(dateValue);
    return new Date(date.y, date.m - 1, date.d);
  }

  // If it's a string, try parsing it
  const date = new Date(dateValue);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // If all parsing attempts fail
  throw new Error(`Invalid date format: ${dateValue}`);
};

const processExcelData = async (filePath) => {
  try {
    // Read Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log('Excel data:', data);

    // Group papers by domain
    const domainPapers = {};
    data.forEach(row => {
      if (!row.Domain || !row['Abstract Title']) return;
      
      if (!domainPapers[row.Domain]) {
        domainPapers[row.Domain] = [];
      }
      domainPapers[row.Domain].push(row);
    });

    // Get existing papers from database
    const existingPapers = await Paper.find();
    const newPapers = [];
    const duplicates = [];
    const errors = [];

    // Process each domain
    Object.entries(domainPapers).forEach(([domain, papers]) => {
      // Calculate rooms needed
      const roomsNeeded = Math.min(
        papers.length % PAPERS_PER_ROOM === 0 
          ? Math.floor(papers.length / PAPERS_PER_ROOM)
          : Math.floor(papers.length / PAPERS_PER_ROOM) + 1,
        MAX_ROOMS_PER_DOMAIN
      );

      // Process papers in each room
      papers.forEach((row, index) => {
        try {
          const presenterNames = row.Presenters ? row.Presenters.split(',').map(p => p.trim()) : [];
          const contacts = row['Phone Numbers'] ? row['Phone Numbers'].toString().split(',').map(c => c.trim()) : [];
          const emails = row.Emails ? row.Emails.split(',').map(e => e.trim()) : [];

          if (presenterNames.length === 0 || emails.length === 0) {
            throw new Error(`Row ${index + 1}: At least one presenter with email is required`);
          }

          const presenters = presenterNames.map((name, idx) => ({
            name: name,
            email: emails[idx] || '',
            contact: contacts[idx] || '',
            hasSelectedSlot: false
          }));

          // Use a default date if not provided or invalid
          const defaultDate = new Date();
          defaultDate.setHours(0, 0, 0, 0);

          // Calculate room for this paper
          const roomNumber = Math.floor(index / PAPERS_PER_ROOM) + 1;
          const roomName = generateRoomName(domain, roomNumber);

          const paper = {
            domain: domain,
            title: row['Abstract Title'],
            presenters,
            synopsis: row.synopsis || '',
            presentationDate: defaultDate,
            teamId: generateTeamId(domain, index),
            isSlotAllocated: false,
            room: roomName,
            timeSlot: null,
            day: null
          };

          const duplicateCheck = isDuplicatePaper(paper, existingPapers, newPapers);
          if (duplicateCheck.isDuplicate) {
            duplicates.push({
              title: paper.title,
              reason: duplicateCheck.reason
            });
          } else {
            newPapers.push(paper);
          }
        } catch (error) {
          errors.push(error.message);
        }
      });
    });

    if (errors.length > 0) {
      return {
        success: false,
        message: 'Validation errors found in Excel data',
        errors
      };
    }

    if (duplicates.length > 0) {
      console.log('Duplicate papers found:', duplicates);
    }

    if (newPapers.length === 0) {
      return { 
        success: false, 
        message: 'No new papers to import. All papers are duplicates or contain errors.',
        duplicates,
        errors
      };
    }

    // Save to database without slot allocation
    await Paper.insertMany(newPapers);

    return { 
      success: true, 
      message: `Successfully imported ${newPapers.length} papers.${duplicates.length > 0 ? ` Skipped ${duplicates.length} duplicate papers.` : ''}`,
      duplicates,
      errors
    };
  } catch (error) {
    console.error('Error importing Excel data:', error);
    return { 
      success: false, 
      message: error.message,
      errors: [error.message]
    };
  }
};

module.exports = { processExcelData, generateRoomName, TIME_SLOTS }; 