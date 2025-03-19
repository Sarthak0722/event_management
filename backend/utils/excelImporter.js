const xlsx = require('xlsx');
const Paper = require('../models/Paper');

const TIME_SLOTS = [
  '09:00 - 09:30', '09:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00',
  '11:20 - 11:50', '11:50 - 12:20', '12:20 - 12:50', '12:50 - 13:20',
  '14:00 - 14:30', '14:30 - 15:00', '15:00 - 15:30', '15:30 - 16:00'
];

const generateTeamId = (domain, index) => {
  return `${domain}${String(index + 1).padStart(3, '0')}`;
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

const cleanupExistingDuplicates = async () => {
  try {
    const allPapers = await Paper.find().lean();
    const uniquePapers = [];
    const duplicates = [];
    const seenTitles = new Set();
    const seenEmails = new Set();

    // First pass: Keep papers with unique titles and no duplicate presenters
    for (const paper of allPapers) {
      const title = paper.title.toLowerCase();
      const presenterEmails = paper.presenters.map(p => p.email.toLowerCase());
      
      let isDuplicate = false;
      let reason = '';

      if (seenTitles.has(title)) {
        isDuplicate = true;
        reason = `Duplicate title: ${paper.title}`;
      } else {
        const hasEmailConflict = presenterEmails.some(email => seenEmails.has(email));
        if (hasEmailConflict) {
          isDuplicate = true;
          reason = `Presenter already has another paper: ${presenterEmails.join(', ')}`;
        }
      }

      if (!isDuplicate) {
        uniquePapers.push(paper);
        seenTitles.add(title);
        presenterEmails.forEach(email => seenEmails.add(email));
      } else {
        duplicates.push({ paper, reason });
      }
    }

    // Delete all papers and reinsert unique ones
    await Paper.deleteMany({});
    
    // Reassign team IDs and room allocations
    const papersByDomain = uniquePapers.reduce((acc, paper) => {
      if (!acc[paper.domain]) {
        acc[paper.domain] = [];
      }
      acc[paper.domain].push(paper);
      return acc;
    }, {});

    const papersToInsert = [];
    for (const [domain, domainPapers] of Object.entries(papersByDomain)) {
      domainPapers.forEach((paper, index) => {
        const room = Math.floor(index / TIME_SLOTS.length) + 1;
        const timeSlotIndex = index % TIME_SLOTS.length;
        paper.room = room;
        paper.timeSlot = TIME_SLOTS[timeSlotIndex];
        paper.teamId = generateTeamId(domain, index);
        papersToInsert.push(paper);
      });
    }

    await Paper.insertMany(papersToInsert);

    return {
      success: true,
      uniqueCount: papersToInsert.length,
      duplicatesRemoved: duplicates.length,
      duplicates
    };
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const processExcelData = async (filePath) => {
  try {
    // First, clean up existing duplicates
    console.log('Cleaning up existing duplicates...');
    const cleanupResult = await cleanupExistingDuplicates();
    console.log('Cleanup result:', cleanupResult);

    // Read Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log('Excel data:', data);

    // Get existing papers from database (after cleanup)
    const existingPapers = await Paper.find();
    const newPapers = [];
    const duplicates = [];

    // Process each row and check for duplicates
    data.forEach((row, index) => {
      const presenterNames = row.Presentors ? row.Presentors.split(',').map(p => p.trim()) : [];
      const contacts = row.contact ? row.contact.toString().split(',').map(c => c.trim()) : [];
      const emails = row.email ? row.email.split(',').map(e => e.trim()) : [];

      const presenters = presenterNames.map((name, idx) => ({
        name: name,
        email: emails[idx] || '',
        contact: contacts[idx] || ''
      }));

      const paper = {
        domain: row.Domain.toUpperCase(),
        title: row.Name,
        presenters,
        synopsis: row.synopsis || '',
        preferredDay: new Date(row.preferedday),
        teamId: generateTeamId(row.Domain.toUpperCase(), index)
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
    });

    if (duplicates.length > 0) {
      console.log('Duplicate papers found:', duplicates);
    }

    if (newPapers.length === 0) {
      return { 
        success: false, 
        message: 'No new papers to import. All papers are duplicates.',
        duplicates,
        cleanupResult 
      };
    }

    // Group papers by domain
    const papersByDomain = newPapers.reduce((acc, paper) => {
      if (!acc[paper.domain]) {
        acc[paper.domain] = [];
      }
      acc[paper.domain].push(paper);
      return acc;
    }, {});

    // Allocate rooms and time slots
    for (const [domain, domainPapers] of Object.entries(papersByDomain)) {
      domainPapers.forEach((paper, index) => {
        const room = Math.floor(index / TIME_SLOTS.length) + 1;
        const timeSlotIndex = index % TIME_SLOTS.length;
        paper.room = room;
        paper.timeSlot = TIME_SLOTS[timeSlotIndex];
        paper.day = 1;
      });
    }

    // Save to database
    await Paper.insertMany(newPapers);

    return { 
      success: true, 
      message: `Successfully imported ${newPapers.length} papers.${duplicates.length > 0 ? ` Skipped ${duplicates.length} duplicate papers.` : ''}`,
      duplicates,
      cleanupResult
    };
  } catch (error) {
    console.error('Error importing Excel data:', error);
    return { success: false, message: error.message };
  }
};

module.exports = { processExcelData, cleanupExistingDuplicates }; 