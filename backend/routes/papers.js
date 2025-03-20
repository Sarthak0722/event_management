const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const { processExcelData, cleanupExistingDuplicates } = require('../utils/excelImporter');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const TIME_SLOTS = [
  '09:00 - 09:30', '09:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00',
  '11:20 - 11:50', '11:50 - 12:20', '12:20 - 12:50', '12:50 - 13:20',
  '14:00 - 14:30', '14:30 - 15:00', '15:00 - 15:30', '15:30 - 16:00'
];

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

// Get available slots for a domain
router.get('/available-slots/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const papers = await Paper.find({ domain, isSlotAllocated: true });
    
    // Get all taken slots
    const takenSlots = papers.map(paper => ({
      room: paper.room,
      timeSlot: paper.timeSlot
    }));

    // Calculate available slots
    const availableSlots = [];
    let currentRoom = 1;
    let roomHasSpace = true;

    while (roomHasSpace) {
      const roomSlots = TIME_SLOTS.filter(slot => 
        !takenSlots.some(taken => 
          taken.room === currentRoom && taken.timeSlot === slot
        )
      );

      if (roomSlots.length > 0) {
        availableSlots.push({
          room: currentRoom,
          availableTimeSlots: roomSlots
        });
      }

      // If current room is full (no available slots), check next room
      // If current room has slots, no need to check next room
      roomHasSpace = roomSlots.length === 0 && papers.some(p => p.room === currentRoom);
      if (roomHasSpace) {
        currentRoom++;
      }
    }

    res.json({ success: true, data: availableSlots });
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
    res.json({ success: true, data: papers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Select a slot for a paper
router.post('/select-slot/:paperId', async (req, res) => {
  try {
    const { paperId } = req.params;
    const { room, timeSlot, presenterEmail } = req.body;

    // Check if slot is available
    const existingPaper = await Paper.findOne({
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

    // Update paper with selected slot
    const paper = await Paper.findById(paperId);
    
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Verify presenter is authorized to select slot
    const presenter = paper.presenters.find(p => p.email === presenterEmail);
    if (!presenter) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to select a slot for this paper'
      });
    }

    if (presenter.hasSelectedSlot) {
      return res.status(400).json({
        success: false,
        message: 'You have already selected a slot for this paper'
      });
    }

    // Update the paper with slot information
    paper.room = room;
    paper.timeSlot = timeSlot;
    paper.isSlotAllocated = true;
    presenter.hasSelectedSlot = true;

    await paper.save();

    res.json({
      success: true,
      message: 'Slot selected successfully',
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