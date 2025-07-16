const SpecialSession = require('../models/SpecialSession');
const Paper = require('../models/paper');
const User = require('../models/user');
const { createNotificationHelper } = require('./notificationController');

// Helper function to validate session time
const validateSessionTime = (startTime, endTime) => {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  
  // Session 1: 9:00-12:00
  const session1Start = new Date('1970-01-01T09:00');
  const session1End = new Date('1970-01-01T12:00');
  
  // Session 2: 1:00-4:00
  const session2Start = new Date('1970-01-01T13:00');
  const session2End = new Date('1970-01-01T16:00');

  if (start >= session1Start && end <= session1End) {
    return 'Session 1';
  }
  if (start >= session2Start && end <= session2End) {
    return 'Session 2';
  }
  return null;
};

// Add a new special session
const addSpecialSession = async (req, res) => {
  try {
    const { title, speaker, room, sessionType, date, startTime, endTime, description } = req.body;

    // Validate session time
    const session = validateSessionTime(startTime, endTime);
    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'Special session must be within Session 1 (9:00-12:00) or Session 2 (1:00-4:00)'
      });
    }

    // Check if there's any overlap with existing special sessions
    const existingSession = await SpecialSession.findOne({
      date,
      room,
      session,
      $or: [
        {
          startTime: { $lte: endTime },
          endTime: { $gte: startTime }
        }
      ]
    });

    if (existingSession) {
      return res.status(409).json({
        success: false,
        message: 'A special session already exists in this room during this time'
      });
    }

    const specialSession = new SpecialSession({
      title,
      speaker,
      room,
      sessionType,
      date,
      startTime,
      endTime,
      session,
      description
    });

    await specialSession.save();

    // Create notifications for all attendees about the new special session
    try {
      const attendees = await User.find({ role: 'attendee' });
      console.log('Found attendees:', attendees.length);
      
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      for (const attendee of attendees) {
        console.log('Creating notification for attendee:', attendee.email);
        const notification = await createNotificationHelper({
          title: 'New Special Session Added',
          message: `A new ${sessionType} has been scheduled: "${title}" by ${speaker} in Room ${room} on ${formattedDate} from ${startTime} to ${endTime}`,
          type: 'info',
          recipient: attendee.email,
          relatedTo: specialSession._id
        });
        console.log('Notification created for attendee:', notification);
      }
    } catch (notifError) {
      console.error('Error creating notifications for attendees:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Special session added successfully',
      data: specialSession
    });
  } catch (error) {
    console.error('Error adding special session:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding special session',
      error: error.message
    });
  }
};

// Get special sessions by date
const getSpecialSessionsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const specialSessions = await SpecialSession.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({
      startTime: 1
    });

    res.json({
      success: true,
      data: specialSessions
    });
  } catch (error) {
    console.error('Error fetching special sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching special sessions',
      error: error.message
    });
  }
};

// Get all special sessions
const getAllSpecialSessions = async (req, res) => {
  try {
    const specialSessions = await SpecialSession.find().sort({
      date: 1,
      startTime: 1
    });

    res.json({
      success: true,
      data: specialSessions
    });
  } catch (error) {
    console.error('Error fetching all special sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching special sessions',
      error: error.message
    });
  }
};

module.exports = {
  addSpecialSession,
  getSpecialSessionsByDate,
  getAllSpecialSessions
};
