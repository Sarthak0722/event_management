const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const { processExcelData, cleanupExistingDuplicates } = require('../utils/excelImporter');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Import papers from Excel
router.post('/import', async (req, res) => {
  try {
    const excelPath = path.join(__dirname, '../data/data.xlsx');
    const result = await processExcelData(excelPath);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all papers grouped by domain
router.get('/', async (req, res) => {
  try {
    const papers = await Paper.find().sort({ domain: 1, room: 1, timeSlot: 1 });
    
    // Group papers by domain
    const papersByDomain = papers.reduce((acc, paper) => {
      if (!acc[paper.domain]) {
        acc[paper.domain] = [];
      }
      acc[paper.domain].push(paper);
      return acc;
    }, {});

    res.json({ success: true, data: papersByDomain });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get paper details by ID
router.get('/:id', async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ success: false, message: 'Paper not found' });
    }
    res.json({ success: true, data: paper });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add new endpoint for cleaning up duplicates
router.post('/cleanup-duplicates', async (req, res) => {
  try {
    const result = await cleanupExistingDuplicates();
    res.json(result);
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; 