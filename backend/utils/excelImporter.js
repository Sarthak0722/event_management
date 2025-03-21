const xlsx = require('xlsx');
const Paper = require('../models/Paper');
const mongoose = require('mongoose');

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

// Check if a paper is a duplicate (same title and exact same presenters)
const isDuplicate = (title, presenters, newPapers) => {
  console.log(`Checking for duplicates for paper: ${title}`);
  console.log(`Number of papers in current batch: ${newPapers.length}`);

  for (const paper of newPapers) {
    // First check if title matches (case-insensitive)
    const titleMatches = paper.title.toLowerCase() === title.toLowerCase();
    if (!titleMatches) {
      continue;
    }

    console.log(`Found title match: ${paper.title}`);
    
    // Then check if ALL presenter emails match (case-insensitive)
    const newEmails = presenters.map(p => p.email.toLowerCase()).sort();
    const existingEmails = paper.presenters.map(p => p.email.toLowerCase()).sort();
    
    console.log('New presenter emails:', newEmails);
    console.log('Existing presenter emails:', existingEmails);

    // Check if arrays have same length and all elements match
    const emailsMatch = newEmails.length === existingEmails.length &&
      newEmails.every((email, index) => email === existingEmails[index]);
    
    if (emailsMatch) {
      console.log('Found exact presenter match');
      return true;
    }
  }

  return false;
};

const processExcelData = async (filePath) => {
  try {
    // Read Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log('Excel file structure:');
    console.log('Sheet name:', sheetName);
    console.log('First row columns:', Object.keys(data[0]));
    console.log('First row data:', JSON.stringify(data[0], null, 2));

    const newPapers = [];
    const duplicates = [];
    const errors = [];

    // Process each row
    for (const [index, row] of data.entries()) {
      try {
        console.log(`\nProcessing row ${index + 1}:`, JSON.stringify(row, null, 2));

        if (!row.Domain || !row.Title || !row.Synopsis) {
          throw new Error(`Row ${index + 1}: Domain, Title, and Synopsis are required`);
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
          phone: contacts[idx] || ''
        }));

        console.log('Presenters:', JSON.stringify(presenters, null, 2));

        // Check for duplicates (same title and exact same presenters)
        if (isDuplicate(row.Title, presenters, newPapers)) {
          console.log('Found duplicate:', row.Title);
          duplicates.push({
            title: row.Title,
            reason: 'Paper with same title and exact same presenters already exists in this import batch'
          });
          continue;
        }

        const paper = new Paper({
          domain: row.Domain,
          title: row.Title,
          presenters: presenters,
          synopsis: row.Synopsis,
          teamId: generateTeamId(row.Domain, index),
          selectedSlot: {
            date: null,
            room: '',
            timeSlot: ''
          }
        });

        console.log('Created paper:', JSON.stringify(paper, null, 2));
        newPapers.push(paper);
      } catch (error) {
        console.error('Error processing row:', error);
        errors.push(error.message);
      }
    }

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
    console.log(`Saving ${newPapers.length} papers to database...`);
    await Paper.insertMany(newPapers);
    console.log('Papers saved successfully');

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