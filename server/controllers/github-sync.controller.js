const githubSyncService = require('../services/github-sync.service');

exports.syncOrganization = async (req, res) => {
  try {
    const { orgName } = req.params;
    const organization = await githubSyncService.syncOrganization(orgName);
    res.json({ message: 'Organization synced successfully', organization });
  } catch (error) {
    console.error('Error in syncOrganization:', error);
    res.status(500).json({ message: 'Error syncing organization', error: error.message });
  }
};

exports.syncRepository = async (req, res) => {
  try {
    const { repoFullName } = req.params;
    const repository = await githubSyncService.syncRepository(repoFullName);
    res.json({ message: 'Repository synced successfully', repository });
  } catch (error) {
    console.error('Error in syncRepository:', error);
    res.status(500).json({ message: 'Error syncing repository', error: error.message });
  }
}; 