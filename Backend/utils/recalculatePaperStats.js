// utils/recalculatePaperStats.js
const Paper = require('../models/paper');
const PaperStats = require('../models/PaperStats');

async function recalculatePaperStats() {
  try {
    const papers = await Paper.find();
    const domainCounts = {};
    let total = 0;

    for (const paper of papers) {
      total++;
      const domain = paper.domain.trim(); // handles extra spaces if any
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    }

    let stats = await PaperStats.findOne();
    if (!stats) stats = new PaperStats();

    stats.totalPapers = total;
    stats.domainCounts = domainCounts;

    await stats.save();
    console.log('✅ Paper statistics updated successfully.');
  } catch (err) {
    console.error('❌ Error recalculating paper stats:', err);
  }
}

module.exports = recalculatePaperStats;
