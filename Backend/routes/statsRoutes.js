// routes/statsRoutes.js
const express = require('express');
const router = express.Router();
const recalculatePaperStats = require('../utils/recalculatePaperStats');

router.post('/', async (req, res) => {
  try {
    await recalculatePaperStats();
    res.status(200).json({ message: 'Paper stats recalculated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update stats.', details: err.message });
  }
});

module.exports = router;
