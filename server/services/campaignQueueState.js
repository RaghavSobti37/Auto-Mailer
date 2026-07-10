const stoppedCampaignIds = new Set();

function isCampaignStopped(campaignId) {
  return stoppedCampaignIds.has(String(campaignId));
}

function markCampaignStopped(campaignId) {
  stoppedCampaignIds.add(String(campaignId));
}

function clearCampaignStopped(campaignId) {
  stoppedCampaignIds.delete(String(campaignId));
}

module.exports = { isCampaignStopped, markCampaignStopped, clearCampaignStopped };
