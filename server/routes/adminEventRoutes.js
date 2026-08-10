const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

// All routes here will be protected by authenticateAdmin in server/index.js
router.get('/registrations', eventController.getRegistrations);
router.get('/registrations/export', eventController.exportRegistrations);

module.exports = router;
