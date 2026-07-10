const express = require('express');
const router = express.Router();
const controller = require('./controllers/dataHubController');
const multer = require('multer');

const upload = multer({ dest: 'data/uploads/' });

router.get('/folders', controller.getFolders);
router.get('/people', controller.listPeople);
router.get('/people/:id', controller.getPerson);
router.post('/people/bulk-delete', controller.bulkDeletePeople);
router.get('/analytics', controller.getAnalytics);
router.get('/analytics/overlap', controller.getOverlap);
router.get('/campaign-outcomes', controller.listCampaignOutcomes);
router.get('/campaign-outcomes/:campaignName/recipients', controller.getCampaignOutcomeRecipients);
router.post('/campaign-outcomes/import', upload.single('file'), controller.importCampaignOutcomes);
router.get('/sync-status', controller.getSyncStatus);
router.post('/reconcile', controller.reconcile);
router.post('/rebuild-person-hub', controller.rebuildPersonHub);
router.post('/backup/run', controller.runBackup);

module.exports = router;
