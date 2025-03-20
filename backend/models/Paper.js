const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  presenters: [{
    name: String,
    email: String,
    contact: String,
    hasSelectedSlot: {
      type: Boolean,
      default: false
    }
  }],
  synopsis: {
    type: String,
    default: ''
  },
  presentationDate: {
    type: Date,
    required: true
  },
  // Slot allocation fields
  isSlotAllocated: {
    type: Boolean,
    default: false
  },
  room: {
    type: String,
    default: null
  },
  timeSlot: {
    type: String,
    default: null
  },
  day: {
    type: Number,
    default: null
  },
  teamId: {
    type: String,
    required: true,
    unique: true
  }
});

// Add index for efficient querying
paperSchema.index({ domain: 1, room: 1, timeSlot: 1 });

module.exports = mongoose.model('Paper', paperSchema); 