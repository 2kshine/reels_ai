
const express = require('express');
const router = express();
const authenticateRoutes = require('./main-routes');
router.use('/audio', authenticateRoutes);

module.exports = router;
