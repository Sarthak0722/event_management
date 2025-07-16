const mongoose = require('mongoose');

const specialSessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  speaker: {
    type: String,
    required: true
  },
  room: {
    type: String,
    required: true
  },
  sessionType: {
    type: String,
    enum: ['Guest Lecture', 'Keynote Speech', 'Cultural Event', 'Workshop'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  session: {
    type: String,
    enum: ['Session 1', 'Session 2'],
    required: true
  },
  description: {
    type: String,
    required: false
  },
  presentationStatus: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Presented', 'Cancelled'],
    default: 'Scheduled'
  }
}, { timestamps: true });

// Add index for efficient querying
specialSessionSchema.index({ date: 1, room: 1, session: 1 });

module.exports = mongoose.model('SpecialSession', specialSessionSchema);
