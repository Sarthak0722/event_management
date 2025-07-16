const express = require('express');
const router = express.Router();
const Paper = require('../models/paper');
const User = require('../models/user');
const { processExcelData, generateRoomName, TIME_SLOTS } = require('../utils/excelImporter');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const XLSX = require('xlsx');
const PaperController = require('../controllers/paperController');
const { adminAddPaper } = require('../controllers/paperController');
const { protect, authorize } = require('../middleware/auth');
const SpecialSession = require('../models/SpecialSession');
const { createNotificationHelper } = require('../controllers/notificationController');
const { sendSlotConfirmationEmail } = require('../controllers/paperController');
const { autoAssignSlots } = require('../controllers/autoAssignSlots');

// Constants
const PAPERS_PER_ROOM = 12;
const MAX_ROOMS_PER_DOMAIN = 10;
const ALLOWED_DATES = [
  '2026-01-09',
  '2026-01-10',
  '2026-01-11'
];

const CONFERENCE_DAYS = 3;
const PAPERS_PER_SESSION = 6;


const calculateRoomsPerDay = (paperCount) => {
  const papersPerDay = Math.ceil(paperCount / CONFERENCE_DAYS);
  const roomsNeeded = Math.ceil(papersPerDay / PAPERS_PER_ROOM);
  return Math.min(roomsNeeded, MAX_ROOMS_PER_DOMAIN);
};


router.post('/admin/auto-assign-slots',protect, authorize('admin'), autoAssignSlots);

router.post('/admin-add', protect, authorize('admin'), adminAddPaper);

router.post('/import', async (req, res) => {
  try {
    const excelPath = path.join(__dirname, '../data/data.xlsx');
    const result = await processExcelData(excelPath);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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

// Get statistics for papers and special sessions
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  console.log('Fetching statistics...');
  try {
    // Fetch all papers and special sessions
    console.log('Fetching papers...');
    const papers = await Paper.find().lean();
    console.log(`Found ${papers.length} papers`);

    console.log('Fetching special sessions...');
    const specialSessions = await SpecialSession.find().lean();
    console.log(`Found ${specialSessions.length} special sessions`);

    // Calculate scheduling statistics
    const schedulingStats = {
      scheduled: papers.filter(paper => paper.selectedSlot && paper.selectedSlot.room && paper.selectedSlot.session).length,
      notScheduled: papers.filter(paper => !paper.selectedSlot || !paper.selectedSlot.room || !paper.selectedSlot.session).length
    };

    // Calculate presentation statistics
    const presentationStats = {
      presented: papers.filter(paper => paper.presentationStatus === 'Presented').length,
      inProgress: papers.filter(paper => paper.presentationStatus === 'In Progress').length,
      scheduled: papers.filter(paper => paper.presentationStatus === 'Scheduled').length,
      cancelled: papers.filter(paper => paper.presentationStatus === 'Cancelled').length,
      reported: papers.filter(paper => paper.presentationStatus === 'Reported').length
    };

    // Calculate special session statistics
    const specialSessionStats = {
      total: specialSessions.length,
      presented: specialSessions.filter(session => session.presentationStatus === 'Presented').length,
      inProgress: specialSessions.filter(session => session.presentationStatus === 'In Progress').length,
      scheduled: specialSessions.filter(session => session.presentationStatus === 'Scheduled').length,
      cancelled: specialSessions.filter(session => session.presentationStatus === 'Cancelled').length
    };

    console.log('Successfully calculated statistics');
    res.json({
      success: true,
      data: {
        schedulingStats,
        presentationStats,
        specialSessionStats,
        totalPapers: papers.length,
        totalSpecialSessions: specialSessions.length
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});


router.get('/available-slots', async (req, res) => {
  try {
    const { domain, date } = req.query;
    if (!domain || !date) {
      return res.status(400).json({ success: false, message: 'Domain and date are required' });
    }

    const formattedDate = date.split('T')[0];
    if (!ALLOWED_DATES.includes(formattedDate)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Selected date is not available. Please choose from January 9-11, 2026' 
      });
    }

    const specialSessions = await SpecialSession.find({ date: new Date(date) });

    const totalPapers = await Paper.countDocuments({ domain });
    const papersPerDay = Math.ceil(totalPapers / CONFERENCE_DAYS);

    const roomsNeeded = calculateRoomsPerDay(totalPapers);

    const occupiedSlots = await Paper.find({
      domain,
      'selectedSlot.date': new Date(date),
      'selectedSlot.room': { $ne: '' },
      'selectedSlot.session': { $ne: '' }
    }).select('selectedSlot');

    const papersByRoomAndSession = {};
    occupiedSlots.forEach(paper => {
      const { room, session } = paper.selectedSlot;
      const key = `${room}_${session}`;
      if (!papersByRoomAndSession[key]) {
        papersByRoomAndSession[key] = 0;
      }
      papersByRoomAndSession[key]++;
    });

    const rooms = Array.from({ length: roomsNeeded }, (_, i) => generateRoomName(domain, i + 1));

    const availableSlots = rooms.map(room => {
      const roomSpecialSessions = specialSessions.filter(s => s.room === room);

      const slots = ['Session 1', 'Session 2'].map(session => {
        const key = `${room}_${session}`;
        const count = papersByRoomAndSession[key] || 0;
        const isFull = count >= PAPERS_PER_SESSION;
        const hasSpecialSession = roomSpecialSessions.some(s => s.session === session);

        return {
          session,
          count,
          isFull,
          disabled: isFull || hasSpecialSession
        };
      });

      return {
        room,
        slots
      };
    });

    res.json({
      success: true,
      data: {
        totalPapers,
        papersPerDay,
        roomsNeeded,
        availableSlots
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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

// Endpoint to get all unique presenter emails
router.get('/presenter-emails', async (req, res) => {
  try {
    const papers = await Paper.find({}, 'presenters.email');
    const emailSet = new Set();
    papers.forEach(paper => {
      paper.presenters.forEach(presenter => {
        if (presenter.email) emailSet.add(presenter.email);
      });
    });
    res.json({ success: true, emails: Array.from(emailSet) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


router.get('/by-date', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ success: false, message: 'Date is required' });
  }
  try {
    const targetDate = new Date(date);

    const papers = await Paper.find({ 'selectedSlot.date': targetDate });
    const specialSessions = await SpecialSession.find({ date: targetDate });

    const mergedEvents = [
      ...papers.map(p => ({ ...p.toObject(), eventType: 'presentation' })),
      ...specialSessions.map(s => ({ ...s.toObject(), isSpecialSession: true, eventType: 'special' }))
    ];

    res.json({ success: true, data: mergedEvents });
  } catch (error) {
    console.error('❌ Error fetching papers by date:', error);
    res.status(500).json({ success: false, message: 'Server error fetching papers by date' });
  }
});

// ✅ Updated to use atomic controller method
router.post('/select-slot', async (req, res) => {
  try {
    const { paperId, date, room, session, presenterEmail } = req.body;

    // Validate all required fields
    if (!paperId || !date || !room || !session || !presenterEmail) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const paper = await Paper.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Update the paper with the selected slot
    const updated = await Paper.findByIdAndUpdate(
      paperId,
      {
        selectedSlot: {
          date,
          room,
          session,
          bookedBy: presenterEmail,
        },
        isSlotAllocated: true,
      },
      { new: true }
    );

    // Create notifications for all presenters
    for (const presenter of paper.presenters) {
      await createNotificationHelper({
        title: 'Presentation Slot Selected',
        message: `A slot has been selected for "${paper.title}": Room ${room}, ${session} on ${date}`,
        type: 'success',
        recipient: presenter.email,
        relatedTo: paper._id
      });
    }

    // Create notifications for all attendees
    try {
      const attendees = await User.find({ role: 'attendee' });
      console.log('Found attendees:', attendees.length);
      
      for (const attendee of attendees) {
        console.log('Creating notification for attendee:', attendee.email);
        await createNotificationHelper({
          title: 'New Presentation Scheduled',
          message: `A new presentation "${paper.title}" has been scheduled in Room ${room}, ${session} on ${date}`,
          type: 'info',
          recipient: attendee.email,
          relatedTo: paper._id
        });
      }
    } catch (notifError) {
      console.error('Error creating notifications for attendees:', notifError);
    }

    // Create notifications for all admins
    try {
      const admins = await User.find({ role: 'admin' });
      console.log('Found admins:', admins.length);
      
      for (const admin of admins) {
        console.log('Creating notification for admin:', admin.email);
        await createNotificationHelper({
          title: 'Presentation Slot Selected',
          message: `A slot has been selected for "${paper.title}": Room ${room}, ${session} on ${date}`,
          type: 'info',
          recipient: admin.email,
          relatedTo: paper._id
        });
      }
    } catch (notifError) {
      console.error('Error creating notifications for admins:', notifError);
    }

    await sendSlotConfirmationEmail(updated);


    res.json({
      success: true,
      message: 'Slot selected successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Public endpoint for full conference timetable
router.get('/schedule', async (req, res) => {
  try {
    console.log('📅 Schedule endpoint HIT!');
    const papers = await Paper.find({
      'selectedSlot.date': { $ne: null },
      'selectedSlot.room': { $ne: '' },
      'selectedSlot.session': { $ne: '' }
    }).lean();

    const schedule = papers.map(p => ({
      title: p.title,
      domain: p.domain,
      paperId: p.paperId,
      room: p.selectedSlot.room,
      session: p.selectedSlot.session,
      date: p.selectedSlot.date,
      presenters: p.presenters.map(pr => pr.name).join(', ')
    }));

    res.json({ success: true, data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load timetable', error: err.message });
  }
});

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

router.post('/cleanup-duplicates', async (req, res) => {
  try {
    const result = await cleanupExistingDuplicates();
    res.json(result);
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id/presentation-status', async (req, res) => {
  try {
    const { presentationStatus } = req.body;
    console.log('Updating presentation status:', { id: req.params.id, presentationStatus });
    
    if (!presentationStatus) {
      return res.status(400).json({ success: false, message: 'Presentation status is required' });
    }

    const paper = await Paper.findByIdAndUpdate(
      req.params.id,
      { presentationStatus },
      { new: true }
    );

    if (!paper) {
      return res.status(404).json({ success: false, message: 'Paper not found' });
    }

    console.log('Paper found:', paper);

    // Create notifications for all presenters
    for (const presenter of paper.presenters) {
      console.log('Creating notification for presenter:', presenter.email);
      try {
        const notification = await createNotificationHelper({
          title: 'Presentation Status Updated',
          message: `Your paper "${paper.title}" has been marked as ${presentationStatus}`,
          type: presentationStatus === 'Presented' ? 'success' : 
                presentationStatus === 'In Progress' ? 'info' :
                presentationStatus === 'Cancelled' ? 'error' : 'warning',
          recipient: presenter.email,
          relatedTo: paper._id
        });
        console.log('Notification created:', notification);
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
      }
    }

    // Create notifications for all attendees
    try {
      const attendees = await User.find({ role: 'attendee' });
      console.log('Found attendees:', attendees.length);
      
      for (const attendee of attendees) {
        console.log('Creating notification for attendee:', attendee.email);
        const notification = await createNotificationHelper({
          title: 'Paper Status Update',
          message: `The paper "${paper.title}" in Room ${paper.selectedSlot?.room} has been marked as ${presentationStatus}`,
          type: presentationStatus === 'Presented' ? 'success' : 
                presentationStatus === 'In Progress' ? 'info' :
                presentationStatus === 'Cancelled' ? 'error' : 'warning',
          recipient: attendee.email,
          relatedTo: paper._id
        });
        console.log('Notification created for attendee:', notification);
      }
    } catch (notifError) {
      console.error('Error creating notifications for attendees:', notifError);
    }

    // Create notifications for all admins
    try {
      const admins = await User.find({ role: 'admin' });
      console.log('Found admins:', admins.length);
      
      for (const admin of admins) {
        console.log('Creating notification for admin:', admin.email);
        const notification = await createNotificationHelper({
          title: 'Paper Status Update',
          message: `Paper "${paper.title}" in Room ${paper.selectedSlot?.room} has been marked as ${presentationStatus}`,
          type: presentationStatus === 'Presented' ? 'success' : 
                presentationStatus === 'In Progress' ? 'info' :
                presentationStatus === 'Cancelled' ? 'error' : 'warning',
          recipient: admin.email,
          relatedTo: paper._id
        });
        console.log('Notification created for admin:', notification);
      }
    } catch (notifError) {
      console.error('Error creating notifications for admins:', notifError);
    }

    res.json({
      success: true,
      message: 'Presentation status updated successfully',
      data: paper
    });
  } catch (error) {
    console.error('Error in presentation status update:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// PATCH /api/papers/:id/reported
router.patch('/:id/reported', protect, authorize('admin'), async (req, res) => {
  const { reported } = req.body;

  if (typeof reported !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Reported status must be true or false' });
  }

  try {
    const paper = await Paper.findByIdAndUpdate(
      req.params.id,
      { reported },
      { new: true }
    );

    if (!paper) {
      return res.status(404).json({ success: false, message: 'Paper not found' });
    }

    res.json({ success: true, data: paper, message: 'Reported status updated' });
  } catch (err) {
    console.error('❌ Error updating reported status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

//public endpoint for dashboard
router.get('/stats/public', async (req, res) => {
  try {
    const papers = await Paper.find().lean();
    const specialSessions = await SpecialSession.find().lean();

    const schedulingStats = {
      scheduled: papers.filter(p => p.selectedSlot?.room && p.selectedSlot?.session).length,
      notScheduled: papers.filter(p => !p.selectedSlot?.room || !p.selectedSlot?.session).length
    };

    const presentationStats = {
      presented: papers.filter(p => p.presentationStatus === 'Presented').length,
      inProgress: papers.filter(p => p.presentationStatus === 'In Progress').length,
      scheduled: papers.filter(p => p.presentationStatus === 'Scheduled').length,
      cancelled: papers.filter(p => p.presentationStatus === 'Cancelled').length
    };

    res.json({
      success: true,
      data: {
        schedulingStats,
        presentationStats
      }
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching public stats',
      error: error.message
    });
  }
});

module.exports = router;
