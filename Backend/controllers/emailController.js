const Paper = require('../models/paper');
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const sendSlotReminders = async (req, res) => {
  try {
    const papers = await Paper.find({ isSlotAllocated: false });

    if (papers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All presenters have already booked their slots.'
      });
    }

    let totalEmailsSent = 0;

    for (const paper of papers) {
      const presenterEmails = paper.presenters.map(p => p.email);

      const mailOptions = {
        from: process.env.MAIL_USER,
        to: presenterEmails,
        subject: `Reminder to Book Slot for "${paper.title}"`,
        text: `Dear Presenter(s),

This is a kind reminder to book your presentation slot for the paper titled:

"${paper.title}"

Please log in to the Conference Management System and select your preferred slot before the deadline.

If you do not book a slot, the system will automatically assign one to you.

Regards,  
Conference Management Team`
      };

      await transporter.sendMail(mailOptions);
      totalEmailsSent += presenterEmails.length;
    }

    res.status(200).json({
      success: true,
      message: `${totalEmailsSent} reminder emails sent to presenters of ${papers.length} unassigned papers.`
    });
  } catch (error) {
    console.error('Error sending reminder emails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminders',
      error: error.message
    });
  }
};

module.exports = {
  sendSlotReminders
};
