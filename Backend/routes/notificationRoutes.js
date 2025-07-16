const express = require('express');
const router = express.Router();
const { protect ,authorize } = require('../middleware/auth');
const {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');


// Create a new notification
router.post('/', protect, createNotification);

// Get user's notifications
router.get('/', protect, getUserNotifications);

// Mark notification as read
router.patch('/:id/read', protect, markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', protect, markAllAsRead);

// Delete a notification
router.delete('/:id', protect, deleteNotification);




module.exports = router; 