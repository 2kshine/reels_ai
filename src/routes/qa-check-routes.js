const express = require('express');
const router = express.Router();
const QaCheckController = require('../controllers/qa-check-controller');
const { CheckAuthenticity } = require('../middlewares/check-authenticity');

router.post('/get-videos', CheckAuthenticity, QaCheckController.getAllVideos);
router.post('/qa-response', CheckAuthenticity, QaCheckController.fullfillQaResponse);

module.exports = router;
