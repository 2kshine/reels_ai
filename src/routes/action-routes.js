const express = require('express');
const router = express.Router();
const ActionController = require('../controllers/action-controller');
const { CheckAuthenticity } = require('../middlewares/check-authenticity');

router.post('/capture-link', CheckAuthenticity, ActionController.CaptureLinks);

module.exports = router;
