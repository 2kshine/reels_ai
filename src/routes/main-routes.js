const ActionController = require('../controllers/action-controller.js');
const express = require('express');
const router = express.Router();

// Process raw audio json file
router.post('/generate-reels', ActionController.ProcessRawAudioJson);

module.exports = router;
