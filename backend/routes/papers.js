const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const { processExcelData, generateRoomName, TIME_SLOTS } = require('../utils/excelImporter');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const XLSX = require('xlsx');

// Constants
const PAPERS_PER_ROOM = 12;  // Maximum number of papers per room
const MAX_ROOMS_PER_DOMAIN = 10;  // Maximum rooms allowed for a single domain
const ALLOWED_DATES = [
  '2026-01-09',
  '2026-01-10',
  '2026-01-11'
];

// Calculate rooms needed for a domain
const calculateRoomsForDomain = (paperCount) => {
  const roomsNeeded = Math.ceil(paperCount / PAPERS_PER_ROOM);
  return Math.min(roomsNeeded, MAX_ROOMS_PER_DOMAIN);
};

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

// Get available slots for a specific date and domain
router.get('/available-slots', async (req, res) => {
  try {
    const { domain, date } = req.query;
    if (!domain || !date) {
      return res.status(400).json({ success: false, message: 'Domain and date are required' });
    }

    // Check if date is allowed
    if (!ALLOWED_DATES.includes(date.split('T')[0])) {
      return res.status(400).json({ 
        success: false, 
        message: 'Selected date is not available. Please choose from January 9-11, 2026' 
      });
    }

    // Count total papers in the domain
    const totalPapers = await Paper.countDocuments({ domain });
    const roomsNeeded = calculateRoomsForDomain(totalPapers);

    // Get occupied slots for the specified date
    const occupiedSlots = await Paper.find({
      domain,
      'selectedSlot.date': new Date(date),
      'selectedSlot.room': { $ne: '' },
      'selectedSlot.timeSlot': { $ne: '' }
    }).select('selectedSlot');

    // Generate available rooms
    const rooms = Array.from({ length: roomsNeeded }, (_, i) => 
      generateRoomName(domain, i + 1)
    );

    // Create availability map
    const availableSlots = rooms.map(room => {
      const occupiedTimeSlotsForRoom = occupiedSlots
        .filter(paper => paper.selectedSlot.room === room)
        .map(paper => paper.selectedSlot.timeSlot);

      const availableTimeSlots = TIME_SLOTS.filter(
        slot => !occupiedTimeSlotsForRoom.includes(slot)
      );

      return {
        room,
        timeSlots: availableTimeSlots
      };
    }).filter(slot => slot.timeSlots.length > 0); // Only include rooms with available slots

    res.json({
      success: true,
      data: {
        totalPapers,
        roomsNeeded,
        availableSlots
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get papers by date
router.get('/by-date', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const papers = await Paper.find({
      'selectedSlot.date': {
        $gte: startDate,
        $lte: endDate
      },
      'selectedSlot.room': { $ne: '' },
      'selectedSlot.timeSlot': { $ne: '' }
    }).sort({
      'selectedSlot.timeSlot': 1,
      'selectedSlot.room': 1
    });

    // Group papers by time slot
    const papersByTimeSlot = papers.reduce((acc, paper) => {
      const timeSlot = paper.selectedSlot.timeSlot;
      if (!acc[timeSlot]) {
        acc[timeSlot] = [];
      }
      acc[timeSlot].push(paper);
      return acc;
    }, {});

    res.json({
      success: true,
      data: papersByTimeSlot
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get papers for a specific presenter
router.get('/presenter', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const papers = await Paper.find({
      'presenters.email': email
    });

    res.json({
      success: true,
      data: papers
    });
  } catch (error) {
    console.error('Error fetching presenter papers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Select a slot
router.post('/select-slot', async (req, res) => {
  try {
    const { paperId, date, room, timeSlot, presenterEmail } = req.body;

    if (!paperId || !date || !room || !timeSlot || !presenterEmail) {
      return res.status(400).json({
        success: false,
        message: 'Paper ID, date, room, time slot, and presenter email are required'
      });
    }

    // Check if date is allowed
    if (!ALLOWED_DATES.includes(new Date(date).toISOString().split('T')[0])) {
      return res.status(400).json({ 
        success: false, 
        message: 'Selected date is not available. Please choose from January 9-11, 2026' 
      });
    }

    // Find the paper and verify presenter
    const paper = await Paper.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Verify that the presenter is authorized for this paper
    const isAuthorizedPresenter = paper.presenters.some(p => p.email === presenterEmail);
    if (!isAuthorizedPresenter) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Presenter email does not match paper'
      });
    }

    // Check if slot is already booked by another presenter
    if (paper.selectedSlot && paper.selectedSlot.bookedBy && paper.selectedSlot.bookedBy !== presenterEmail) {
      const bookedByPresenter = paper.presenters.find(p => p.email === paper.selectedSlot.bookedBy);
      return res.status(400).json({
        success: false,
        message: `This slot has already been booked by ${bookedByPresenter?.name || 'another presenter'}`
      });
    }

    // Check if slot is already taken by another paper
    const existingSlot = await Paper.findOne({
      _id: { $ne: paperId },
      domain: paper.domain,
      'selectedSlot.date': new Date(date),
      'selectedSlot.room': room,
      'selectedSlot.timeSlot': timeSlot
    });

    if (existingSlot) {
      return res.status(400).json({
        success: false,
        message: 'This slot is already taken'
      });
    }

    // Update paper with selected slot
    const updatedPaper = await Paper.findByIdAndUpdate(
      paperId,
      {
        selectedSlot: {
          date: new Date(date),
          room,
          timeSlot,
          bookedBy: presenterEmail
        },
        isSlotAllocated: true
      },
      { new: true }
    );

    res.json({
      success: true,
      data: updatedPaper
    });
  } catch (error) {
    console.error('Error selecting slot:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
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