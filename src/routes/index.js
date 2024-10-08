const express = require('express');
const router = express();
const authRoutes = require('./auth-routes');
const qaCheckRoutes = require('./qa-check-routes');
const actionRoutes = require('./action-routes');
router.use('/auth', authRoutes);
router.use('/qa', qaCheckRoutes);
router.use('/action', actionRoutes);

module.exports = router;
