const xlsx = require('xlsx');
const Paper = require('../models/Paper');

const TIME_SLOTS = [
  '09:00 - 09:30', '09:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00',
  '11:20 - 11:50', '11:50 - 12:20', '12:20 - 12:50', '12:50 - 13:20',
  '14:00 - 14:30', '14:30 - 15:00', '15:00 - 15:30', '15:30 - 16:00'
];

const generateTeamId = (domain, index) => {
  // Create an abbreviation from the domain name
  const abbreviation = domain.split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
  return `${abbreviation}${String(index + 1).padStart(3, '0')}`;
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

    // Get existing papers from database
    const existingPapers = await Paper.find();
    const newPapers = [];
    const duplicates = [];
    const errors = [];

    // Process each row and check for duplicates
    data.forEach((row, index) => {
      try {
        if (!row.Domain || !row['Abstract Title']) {
          throw new Error(`Row ${index + 1}: Missing required fields (Domain or Abstract Title)`);
        }

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

        const paper = {
          domain: row.Domain,
          title: row['Abstract Title'],
          presenters,
          synopsis: row.synopsis || '',
          presentationDate: defaultDate,
          teamId: generateTeamId(row.Domain, index),
          isSlotAllocated: false,
          room: null,
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

module.exports = { processExcelData }; 