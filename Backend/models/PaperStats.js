// models/PaperStats.js
const mongoose = require('mongoose');

const paperStatsSchema = new mongoose.Schema({
  totalPapers: {
    type: Number,
    default: 0,
  },
  domainCounts: {
    type: Map,
    of: Number,
    default: {},
  },
}, { collection: 'paperstats' });

module.exports = mongoose.model('PaperStats', paperStatsSchema);
