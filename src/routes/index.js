const express = require('express');
const router = express();
const mainRoutes = require('./main-routes');
const authRoutes = require('./auth-routes');
router.use('/audio', mainRoutes);
router.use('/auth', authRoutes);

module.exports = router;
