const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  addSpecialSession,
  getSpecialSessionsByDate,
  getAllSpecialSessions
} = require('../controllers/specialSessionController');
const SpecialSession = require('../models/SpecialSession');
const User = require('../models/user');
const { createNotificationHelper } = require('../controllers/notificationController');

// Add a new special session (Admin only)
router.post('/add', protect, authorize('admin'), addSpecialSession);

// Get special sessions by date
router.get('/by-date', getSpecialSessionsByDate);

// Get all special sessions (Admin only)
router.get('/all', protect, authorize('admin'), getAllSpecialSessions);

// Update special session status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    console.log('Updating special session status:', { id: req.params.id, status });

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const session = await SpecialSession.findByIdAndUpdate(
      req.params.id,
      { presentationStatus: status },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: 'Special session not found' });
    }

    console.log('Special session found:', session);

    // Create notification for the speaker
    if (session.speaker) {
      console.log('Creating notification for speaker:', session.speaker);
      try {
        const notification = await createNotificationHelper({
          title: 'Special Session Status Updated',
          message: `Your session "${session.title}" has been marked as ${status}`,
          type: status === 'Presented' ? 'success' : 
                status === 'In Progress' ? 'info' :
                status === 'Cancelled' ? 'error' : 'warning',
          recipient: session.speaker,
          relatedTo: session._id
        });
        console.log('Notification created for speaker:', notification);
      } catch (notifError) {
        console.error('Error creating notification for speaker:', notifError);
      }
    }

    // Create notifications for all attendees
    try {
      const attendees = await User.find({ role: 'attendee' });
      console.log('Found attendees:', attendees.length);
      
      for (const attendee of attendees) {
        console.log('Creating notification for attendee:', attendee.email);
        const notification = await createNotificationHelper({
          title: 'Special Session Update',
          message: `The ${session.sessionType} "${session.title}" in Room ${session.room} has been marked as ${status}`,
          type: status === 'Presented' ? 'success' : 
                status === 'In Progress' ? 'info' :
                status === 'Cancelled' ? 'error' : 'warning',
          recipient: attendee.email,
          relatedTo: session._id
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
          title: 'Special Session Update',
          message: `${session.sessionType} "${session.title}" in Room ${session.room} has been marked as ${status}`,
          type: status === 'Presented' ? 'success' : 
                status === 'In Progress' ? 'info' :
                status === 'Cancelled' ? 'error' : 'warning',
          recipient: admin.email,
          relatedTo: session._id
        });
        console.log('Notification created for admin:', notification);
      }
    } catch (notifError) {
      console.error('Error creating notifications for admins:', notifError);
    }

    res.json({
      success: true,
      message: 'Special session status updated successfully',
      data: session
    });
  } catch (error) {
    console.error('Error in special session status update:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; 