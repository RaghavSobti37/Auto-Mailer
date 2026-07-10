const express = require('express');
const router = express.Router();

const campaignsRouter = require('./campaignsRouter');
const campaignApiRouter = require('./campaignApiRouter');
const templatesRouter = require('./templatesRouter');
const profilesRouter = require('./profilesRouter');
const analyticsRouter = require('./analyticsRouter');
const streamsRouter = require('./streamsRouter');
const holysheetRouter = require('./holysheetRouter');

router.use('/campaigns', campaignsRouter);
router.use('/campaign-api', campaignApiRouter);
router.use('/templates', templatesRouter);
router.use('/profiles', profilesRouter);
router.use('/analytics', analyticsRouter);
router.use('/streams', streamsRouter);
router.use('/holysheet', holysheetRouter);

module.exports = router;
