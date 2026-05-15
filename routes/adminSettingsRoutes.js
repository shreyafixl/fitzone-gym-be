const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: { gymName: 'FitZone' } });
});

router.put('/', (req, res) => {
  res.json({ success: true, data: req.body });
});

module.exports = router;
