const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  paperId: {
    type: String,
    required: true,
    unique: true
  },
  synopsis: {
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
    phone: {
      type: String,
      required: true
    }
  }],
  selectedSlot: {
    date: Date,
    room: String,
    session: String,
    bookedBy: String
  },
  isSlotAllocated: {
    type: Boolean,
    default: false
  },
  presentationStatus: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Presented', 'Cancelled'],
    default: 'Scheduled'
  },
  reported: {
    type: Boolean,
    default: false
  }
}, { timestamps: true, collection: 'papers' });

// Add index for efficient querying
paperSchema.index({ domain: 1, room: 1, session: 1 });

module.exports = mongoose.model('Paper', paperSchema); 