const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/campaignsController');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/:id/send', ctrl.send);
router.delete('/:id', ctrl.remove);

module.exports = router;
