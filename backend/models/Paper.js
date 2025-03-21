const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true
  },
  domain: {
    type: String,
    required: true
  },
  presenters: [{
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    contact: String
  }],
  synopsis: {
    type: String,
    default: ''
  },
  teamId: {
    type: String,
    required: true
  },
  selectedSlot: {
    date: Date,
    room: String,
    timeSlot: String,
    bookedBy: String
  },
  isSlotAllocated: {
    type: Boolean,
    default: false
  }
});

// Add index for efficient querying
paperSchema.index({ domain: 1, room: 1, timeSlot: 1 });

module.exports = mongoose.model('Paper', paperSchema); 