const { listPeople, getFolderCounts } = require('../services/listService');
const { getAnalytics, getOverlapMatrix } = require('../services/analyticsService');
const { getSyncState, syncAllInlets } = require('../services/syncService');
const { findHubContact, getPersonBase, getPersonSection, getPerson360 } = require('../services/personDetailService');
const { deletePeopleByIds } = require('../services/deletePeopleService');
const { rebuildPersonHubFromIndex } = require('../services/repairService');
const { runMongoBackup } = require('../../../services/dataHubBackupService');
const {
  inferCampaignNameFromFilename,
  inferStatusFromFilename,
  importAisensyCampaignCsv,
} = require('../../../services/aisensyCampaignImportService');
const {
  listCampaignSummaries,
  listCampaignOutcomeUsers,
} = require('../../../services/aisensyCampaignSyncService');

exports.getFolders = async (req, res) => {
  try {
    const data = await getFolderCounts();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
};

exports.listPeople = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const result = await listPeople({
      folder: req.query.folder || 'all',
      search: req.query.search || '',
      page,
      limit,
      campaign: req.query.campaign,
      originSource: req.query.originSource,
      emailStatus: req.query.emailStatus,
      sort: req.query.sort,
      order: req.query.order,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch people' });
  }
};

exports.getPerson = async (req, res) => {
  try {
    const section = req.query.section;
    if (section) {
      const data = await getPersonSection(req.params.id, section);
      if (!data) return res.status(404).json({ error: 'Person not found' });
      return res.json(data);
    }
    if (req.query.full === 'true' || req.query.full === '1') {
      const person = await getPerson360(req.params.id);
      if (!person) return res.status(404).json({ error: 'Person not found' });
      return res.json(person);
    }
    const person = await getPersonBase(req.params.id);
    if (!person) return res.status(404).json({ error: 'Person not found' });
    res.json(person);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch person' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const folder = req.query.folder || 'all';
    const data = await getAnalytics(folder);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

exports.getOverlap = async (req, res) => {
  try {
    const overlap = await getOverlapMatrix();
    res.json({ overlap });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overlap matrix' });
  }
};

exports.listCampaignOutcomes = async (_req, res) => {
  try {
    const summaries = await listCampaignSummaries();
    res.json({ campaigns: summaries });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to list campaign outcomes' });
  }
};

exports.getCampaignOutcomeRecipients = async (req, res) => {
  try {
    const campaignName = decodeURIComponent(String(req.params.campaignName || '').trim());
    if (!campaignName) return res.status(400).json({ error: 'campaignName required' });
    const result = await listCampaignOutcomeUsers({
      campaignName,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
      status: req.query.status ? String(req.query.status) : undefined,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to list campaign recipients' });
  }
};

exports.importCampaignOutcomes = async (req, res) => {
  try {
    if (!req.file?.path) return res.status(400).json({ error: 'CSV file required' });
    const tags = req.body?.tags
      ? String(req.body.tags).split(/[,;|]/).map((tag) => tag.trim()).filter(Boolean)
      : [];
    const stats = await importAisensyCampaignCsv({
      filePath: req.file.path,
      campaignName: req.body?.campaignName || inferCampaignNameFromFilename(req.file.originalname || ''),
      defaultStatus: req.body?.status || inferStatusFromFilename(req.file.originalname || ''),
      sourceFilename: req.file.originalname,
      tags,
      dryRun: false,
    });
    res.json({ message: 'Campaign outcomes imported', stats });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Import failed' });
  }
};

exports.reconcile = async (req, res) => {
  try {
    const full = req.query.full === 'true';
    const result = await syncAllInlets({ full, incremental: !full });
    res.json({
      message: full ? 'Full sync complete' : 'New data synced',
      stats: result,
      lastSyncedAt: result.syncedAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed' });
  }
};

exports.rebuildPersonHub = async (req, res) => {
  try {
    const full = req.query.full === 'true';
    const havellsOnly = req.query.havells === 'true';
    const filter = havellsOnly ? { 'inlets.key': { $in: ['havells_registered', 'havells_selected', 'havells_attended_delhi', 'havells_attended_indore', 'havells_attended_dumka'] } } : null;
    const result = await rebuildPersonHubFromIndex({ mode: full ? 'full' : 'sync', filter });
    res.json({
      message: full ? 'Person hub fully rebuilt' : 'Person hub synced',
      stats: result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Hub rebuild failed' });
  }
};

exports.getSyncStatus = async (req, res) => {
  try {
    const state = await getSyncState();
    res.json({
      lastSyncedAt: state.lastSyncedAt,
      lastFullSyncAt: state.lastFullSyncAt,
      lastStats: state.lastStats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
};

exports.bulkDeletePeople = async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await deletePeopleByIds(ids);
    res.json({
      message: `Removed ${result.deleted} ${result.deleted === 1 ? 'person' : 'people'} from Data Hub`,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Bulk delete failed' });
  }
};

exports.runBackup = async (_req, res) => {
  try {
    const result = await runMongoBackup();
    if (result.skipped) return res.status(400).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Backup failed' });
  }
};
