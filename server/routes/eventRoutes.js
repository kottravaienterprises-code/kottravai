const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

// POST /api/events/register
router.post('/register', eventController.registerEvent);

module.exports = router;
