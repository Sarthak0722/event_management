const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const { processExcelData, generateRoomName, TIME_SLOTS } = require('../utils/excelImporter');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Maximum number of rooms per domain
const MAX_ROOMS_PER_DOMAIN = 3;

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
    const papers = await Paper.find();
    const papersByDomain = papers.reduce((acc, paper) => {
      if (!acc[paper.domain]) {
        acc[paper.domain] = [];
      }
      acc[paper.domain].push(paper);
      return acc;
    }, {});

    res.json({
      success: true,
      data: papersByDomain
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get available slots for a domain
router.get('/available-slots/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const availableSlots = [];

    // Get all papers in this domain that have allocated slots
    const allocatedPapers = await Paper.find({
      domain,
      isSlotAllocated: true
    });

    // Create a map of occupied slots
    const occupiedSlots = new Map();
    allocatedPapers.forEach(paper => {
      const key = `${paper.room}-${paper.timeSlot}`;
      occupiedSlots.set(key, true);
    });

    // Generate room names for this domain
    for (let roomNum = 1; roomNum <= MAX_ROOMS_PER_DOMAIN; roomNum++) {
      const roomName = generateRoomName(domain, roomNum);
      const availableTimeSlots = TIME_SLOTS.filter(timeSlot => {
        const key = `${roomName}-${timeSlot}`;
        return !occupiedSlots.has(key);
      });

      if (availableTimeSlots.length > 0) {
        availableSlots.push({
          room: roomName,
          availableTimeSlots
        });
      }
    }

    res.json({
      success: true,
      data: availableSlots
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get papers for a specific presenter
router.get('/presenter/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const papers = await Paper.find({
      'presenters.email': email
    });

    res.json({
      success: true,
      data: papers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Select a slot for a paper
router.post('/select-slot/:paperId', async (req, res) => {
  try {
    const { paperId } = req.params;
    const { room, timeSlot, presenterEmail } = req.body;

    // Validate input
    if (!room || !timeSlot || !presenterEmail) {
      return res.status(400).json({
        success: false,
        message: 'Room, time slot, and presenter email are required'
      });
    }

    // Get the paper
    const paper = await Paper.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Verify presenter is authorized
    const presenter = paper.presenters.find(p => p.email === presenterEmail);
    if (!presenter) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Presenter email does not match paper'
      });
    }

    // Check if slot is available
    const existingPaper = await Paper.findOne({
      domain: paper.domain,
      room,
      timeSlot,
      isSlotAllocated: true
    });

    if (existingPaper) {
      return res.status(400).json({
        success: false,
        message: 'This slot is already taken'
      });
    }

    // Update the paper with slot information
    paper.room = room;
    paper.timeSlot = timeSlot;
    paper.isSlotAllocated = true;
    paper.presenters = paper.presenters.map(p => ({
      ...p,
      hasSelectedSlot: p.email === presenterEmail
    }));

    await paper.save();

    res.json({
      success: true,
      data: paper
    });
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