const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    enum: ['AI', 'ML', 'CLOUD', 'CYBERSEC', 'IOT']
  },
  title: {
    type: String,
    required: true
  },
  presenters: [{
    name: String,
    email: String,
    contact: String
  }],
  synopsis: {
    type: String,
    required: true
  },
  preferredDay: {
    type: Date,
    required: true
  },
  // Slot allocation fields
  room: {
    type: Number,
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

module.exports = mongoose.model('Paper', paperSchema); 