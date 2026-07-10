const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/templatesController');

router.get('/', ctrl.list);
router.get('/pending', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/save-draft', ctrl.saveDraft);
router.post('/:id/submit', ctrl.submit);
router.post('/:id/approve', ctrl.approve);
router.post('/:id/reject', ctrl.reject);
router.delete('/:id', ctrl.remove);

module.exports = router;
