const mongoose = require('mongoose');

const paperCounterSchema = new mongoose.Schema({
  domain: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 }
});

module.exports = mongoose.model('PaperCounter', paperCounterSchema);
