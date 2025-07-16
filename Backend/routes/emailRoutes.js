const express = require('express');
const router = express.Router();
const { sendSlotReminders } = require('../controllers/emailController');
const { protect, authorize } = require('../middleware/auth');

router.post('/send-slot-reminders', protect, authorize('admin'), sendSlotReminders);

module.exports = router;
