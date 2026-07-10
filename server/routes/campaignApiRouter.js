const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/campaignApiController');

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/analytics', ctrl.getAnalytics);
router.post('/', ctrl.create);
router.post('/:id/dispatch', ctrl.dispatch);
router.post('/:id/stop', ctrl.stop);
router.delete('/:id', ctrl.remove);

module.exports = router;
