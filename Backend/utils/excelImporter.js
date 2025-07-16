const xlsx = require('xlsx');
const Paper = require('../models/paper');
const PaperCounter = require('../models/PaperCounter');

const mongoose = require('mongoose');

const TIME_SLOTS = [
  '09:00 - 09:30', '09:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00',
  '11:20 - 11:50', '11:50 - 12:20', '12:20 - 12:50', '12:50 - 13:20',
  '14:00 - 14:30', '14:30 - 15:00', '15:00 - 15:30', '15:30 - 16:00'
];

const DOMAIN_CODES = {
  'Cognitive Systems, Vision and Perception': 'CSVP',
  'Cyber Security': 'CS',
  'Advancements in 5g and its applications': '5G',
  'Advancements in blockchain for secure transactions': 'BC',
  'Artificial Intelligence, Machine Learning and Computational Intelligence': 'AIML',
  'Internet of Things and its Applications': 'IOT',
  'Cloud Computing and Virtualization': 'CC',
  'Big Data Analytics': 'BDA'
};

const generateRoomName = (domain, roomNumber) => {
  const domainCode = DOMAIN_CODES[domain] || domain.split(' ').map(word => word[0].toUpperCase()).join('');
  return `${domainCode}-R${String(roomNumber).padStart(2, '0')}`;
};

const generatePaperId = async (domain) => {
  const domainCode = DOMAIN_CODES[domain] || domain.split(' ').map(word => word[0].toUpperCase()).join('');

  const counter = await PaperCounter.findOneAndUpdate(
    { domain },
    { $inc: { count: 1 } },
    { new: true, upsert: true }
  );

  return `${domainCode}${String(counter.count).padStart(3, '0')}`;
};


const isDuplicate = (title, presenters, newPapers) => {
  for (const paper of newPapers) {
    if (paper.title.toLowerCase() !== title.toLowerCase()) continue;

    const newEmails = presenters.map(p => p.email.toLowerCase()).sort();
    const existingEmails = paper.presenters.map(p => p.email.toLowerCase()).sort();

    const emailsMatch = newEmails.length === existingEmails.length &&
      newEmails.every((email, index) => email === existingEmails[index]);

    if (emailsMatch) return true;
  }
  return false;
};

const processExcelData = async (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const newPapers = [];
    const duplicates = [];
    const errors = [];

    for (const [index, row] of data.entries()) {
      try {
        if (!row.Domain || !row.Title || !row.Synopsis) {
          throw new Error(`Row ${index + 1}: Domain, Title, and Synopsis are required`);
        }

        const presenterNames = row.Presenters ? row.Presenters.split(',').map(p => p.trim()) : [];
        const emails = row.Emails ? row.Emails.split(',').map(e => e.trim()) : [];
        const contacts = row['Phone Numbers'] ? row['Phone Numbers'].toString().split(',').map(c => c.trim()) : [];

        if (presenterNames.length === 0 || emails.length === 0) {
          throw new Error(`Row ${index + 1}: At least one presenter with email is required`);
        }

        const presenters = presenterNames.map((name, idx) => ({
          name,
          email: emails[idx] || '',
          phone: contacts[idx] || ''
        }));

        const isBatchDuplicate = isDuplicate(row.Title, presenters, newPapers);

        const existingPapers = await Paper.find({ title: row.Title });
        const isDBDuplicate = existingPapers.some(paper => {
          const dbEmails = paper.presenters.map(p => p.email.toLowerCase()).sort();
          const inputEmails = presenters.map(p => p.email.toLowerCase()).sort();
          return dbEmails.length === inputEmails.length &&
            dbEmails.every((email, i) => email === inputEmails[i]);
        });

        if (isBatchDuplicate || isDBDuplicate) {
          duplicates.push({
            title: row.Title,
            reason: isDBDuplicate ? 'Duplicate in database' : 'Duplicate in this import batch'
          });
          continue;
        }

        const paperId = await generatePaperId(row.Domain);

        const paper = new Paper({
          domain: row.Domain,
          title: row.Title,
          presenters,
          synopsis: row.Synopsis,
          paperId,
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

    await Paper.insertMany(newPapers);

    return {
      success: true,
      message: `Successfully imported ${newPapers.length} papers.${duplicates.length > 0 ? ` Skipped ${duplicates.length} duplicates.` : ''}`,
      duplicates,
      errors
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      errors: [error.message]
    };
  }
};

module.exports = { processExcelData, generateRoomName, TIME_SLOTS, generatePaperId };
