const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/holysheetController');

router.get('/unsubscribes', ctrl.getUnsubscribes);
router.post('/unsubscribes', ctrl.addUnsubscribe);

module.exports = router;
