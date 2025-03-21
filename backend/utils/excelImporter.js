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

const isDuplicateTitle = (title, existingPapers, newPapers) => {
  return [...existingPapers, ...newPapers].some(
    p => p.title.toLowerCase() === title.toLowerCase()
  );
};

const isDuplicatePresenter = (email, existingPapers, newPapers, currentPaper) => {
  return [...existingPapers, ...newPapers].some(paper => {
    if (paper === currentPaper) return false;
    return paper.presenters.some(presenter => presenter.email.toLowerCase() === email.toLowerCase());
  });
};

const processExcelData = async (filePath) => {
  try {
    // Read Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Get existing papers from database
    const existingPapers = await Paper.find();
    const newPapers = [];
    const duplicates = [];
    const errors = [];

    // Process each row
    data.forEach((row, index) => {
      try {
        if (!row.Domain || !row['Abstract Title']) {
          throw new Error(`Row ${index + 1}: Domain and Abstract Title are required`);
        }

        // Check for duplicate title
        if (isDuplicateTitle(row['Abstract Title'], existingPapers, newPapers)) {
          duplicates.push({
            title: row['Abstract Title'],
            reason: 'Duplicate title'
          });
          return;
        }

        // Process presenter information
        const presenterNames = row.Presenters ? row.Presenters.split(',').map(p => p.trim()) : [];
        const emails = row.Emails ? row.Emails.split(',').map(e => e.trim()) : [];
        const contacts = row['Phone Numbers'] ? row['Phone Numbers'].toString().split(',').map(c => c.trim()) : [];

        if (presenterNames.length === 0 || emails.length === 0) {
          throw new Error(`Row ${index + 1}: At least one presenter with email is required`);
        }

        // Create presenters array
        const presenters = presenterNames.map((name, idx) => ({
          name: name,
          email: emails[idx] || '',
          contact: contacts[idx] || ''
        }));

        // Check for duplicate presenters
        const duplicatePresenterEmail = presenters.find(presenter => 
          isDuplicatePresenter(presenter.email, existingPapers, newPapers, null)
        );

        if (duplicatePresenterEmail) {
          duplicates.push({
            title: row['Abstract Title'],
            reason: `Presenter with email ${duplicatePresenterEmail.email} is already presenting another paper`
          });
          return;
        }

        const paper = new Paper({
          domain: row.Domain,
          title: row['Abstract Title'],
          presenters: presenters,
          synopsis: row.Synopsis || '',
          teamId: generateTeamId(row.Domain, index),
          selectedSlot: {
            date: null,
            room: '',
            timeSlot: ''
          }
        });

        newPapers.push(paper);
      } catch (error) {
        errors.push(error.message);
      }
    });

    if (errors.length > 0) {
      return {
        success: false,
        message: 'Validation errors found in Excel data',
        errors
      };
    }

    if (newPapers.length === 0) {
      return {
        success: false,
        message: 'No new papers to import. All papers are duplicates or contain errors.',
        duplicates,
        errors
      };
    }

    // Save to database
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