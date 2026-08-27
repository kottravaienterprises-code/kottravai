const express = require('express');
const router = express.Router();
const { registerHackathon, verifyHackathonPayment } = require('../controllers/hackathonController');

router.post('/register', registerHackathon);
router.post('/verify', verifyHackathonPayment);

module.exports = router;
