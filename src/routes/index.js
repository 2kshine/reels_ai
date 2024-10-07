const express = require('express');
const router = express();
const mainRoutes = require('./main-routes');
const authRoutes = require('./auth-routes');
const qaCheckRoutes = require('./qa-check-routes');
const actionRoutes = require('./action-routes');
router.use('/audio', mainRoutes);
router.use('/auth', authRoutes);
router.use('/qa', qaCheckRoutes);
router.use('/action', actionRoutes);

module.exports = router;
