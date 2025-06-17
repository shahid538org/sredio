const axios = require('axios');
const mongoose = require('mongoose');
const GitHubIntegration = require('../models/github-integration');
const GitHubOrganization = require('../models/github-organization');
const GitHubOrganizationMember = require('../models/github-organization-member');
const GitHubRepository = require('../models/github-repository');
const GitHubCommit = require('../models/github-commit');
const GitHubPullRequest = require('../models/github-pull-request');
const GitHubIssue = require('../models/github-issue');
const GitHubIssueChangelog = require('../models/github-issue-changelog');
const GitHubSyncService = require('../services/github-sync.service');

// Debug: Log environment variables
console.log('GitHub Auth Controller Environment Variables:');
console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID);
console.log('GITHUB_CLIENT_SECRET:', process.env.GITHUB_CLIENT_SECRET ? '***' : undefined);
console.log('GITHUB_CALLBACK_URL:', process.env.GITHUB_CALLBACK_URL);

exports.getAuthUrl = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL;
  const timestamp = req.query.timestamp;
  
  if (!timestamp) {
    return res.status(400).json({ error: 'Timestamp parameter is required' });
  }
  
  // Delete any existing integration to force fresh authorization
  GitHubIntegration.findOneAndDelete({ userId: 'default-user' }).exec();
  
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${callbackUrl}&scope=repo,read:org,read:user&state=${timestamp}&prompt=consent`;
  res.json({ authUrl });
};

exports.handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      throw new Error('Missing required parameters');
    }
    
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL;

    // Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
      state
    }, {
      headers: {
        Accept: 'application/json'
      }
    });

    const { access_token } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `token ${access_token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const { login: githubUsername } = userResponse.data;

    // Create new integration
    const integration = await GitHubIntegration.create({
        userId: 'default-user',
        githubUsername,
        accessToken: access_token,
        isConnected: true,
        connectedAt: new Date()
    });

    console.log('Created GitHub integration for user:', githubUsername);

    // Initialize sync service with the access token
    const syncService = new GitHubSyncService();
    syncService.headers.Authorization = `token ${access_token}`;

    console.log('Starting GitHub data sync for user:', githubUsername);

    // Start syncing user's data
    try {
      // Initialize all collections first
      await syncService.initializeCollections();
      console.log('Collections initialized');

      // Sync user's organizations
      console.log('Fetching user organizations...');
      const orgsResponse = await axios.get('https://api.github.com/user/orgs', {
        headers: {
          Authorization: `token ${access_token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      console.log('Found organizations:', orgsResponse.data.map(org => org.login));

      // Sync each organization
      for (const org of orgsResponse.data) {
        console.log('Syncing organization:', org.login);
        await syncService.syncOrganization(org.login);
      }

      // Also sync user's own repositories with pagination
      console.log('Fetching user repositories...');
      let page = 1;
      let allRepos = [];
      let hasMoreRepos = true;

      while (hasMoreRepos) {
        const reposResponse = await axios.get(`https://api.github.com/user/repos`, {
          headers: {
            Authorization: `token ${access_token}`,
            Accept: 'application/vnd.github.v3+json'
          },
          params: {
            per_page: 100,
            page: page,
            sort: 'updated',
            direction: 'desc'
          }
        });

        const repos = reposResponse.data;
        if (repos.length === 0) {
          hasMoreRepos = false;
        } else {
          allRepos = allRepos.concat(repos);
          page++;
        }
      }

      console.log(`Found ${allRepos.length} repositories for user ${githubUsername}:`, 
        allRepos.map(repo => repo.full_name));

      // Sync each repository
      for (const repo of allRepos) {
        console.log('Syncing repository:', repo.full_name);
        await syncService.syncRepository(repo.full_name);
      }

      // Update last sync time
      await GitHubIntegration.findByIdAndUpdate(integration._id, {
        lastSyncedAt: new Date()
      });

      console.log('GitHub data sync completed successfully');
    } catch (syncError) {
      console.error('Error during GitHub data sync:', syncError);
      if (syncError.response) {
        console.error('GitHub API Error Response:', {
          status: syncError.response.status,
          data: syncError.response.data
        });
      }
      // Don't throw the error, just log it
    }

    // Redirect to client
    const clientUrl = process.env.CLIENT_URL;
    res.redirect(`${clientUrl}?success=true`);
  } catch (error) {
    console.error('Error in handleCallback:', error);
    const clientUrl = process.env.CLIENT_URL;
    res.redirect(`${clientUrl}?error=true`);
  }
};

exports.getIntegrationStatus = async (req, res) => {
  try {
    const integration = await GitHubIntegration.findOne({ userId: 'default-user' });
    res.json({
      connected: integration?.isConnected || false,
      githubUsername: integration?.githubUsername,
      connectedAt: integration?.connectedAt
    });
  } catch (error) {
    console.error('Error in getIntegrationStatus:', error);
    res.status(500).json({ message: 'Error getting integration status' });
  }
};

exports.removeIntegration = async (req, res) => {
  try {
    // Get the integration first to know the GitHub username
    const integration = await GitHubIntegration.findOne({ userId: 'default-user' });
    
    if (integration) {
      const githubUsername = integration.githubUsername;
      console.log(`Removing all data for GitHub user: ${githubUsername}`);

      // Delete all related data
      await Promise.all([
        // Delete the integration
        GitHubIntegration.findOneAndDelete({ userId: 'default-user' }),
        
        // Delete organizations and their members
        GitHubOrganization.deleteMany({ 'owner.login': githubUsername }),
        GitHubOrganizationMember.deleteMany({ 'user.login': githubUsername }),
        
        // Delete repositories and related data
        GitHubRepository.deleteMany({ 'owner.login': githubUsername }),
        GitHubCommit.deleteMany({ 'author.login': githubUsername }),
        GitHubPullRequest.deleteMany({ 'user.login': githubUsername }),
        GitHubIssue.deleteMany({ 'user.login': githubUsername }),
        GitHubIssueChangelog.deleteMany({ 'actor.login': githubUsername })
      ]);

      console.log('Successfully removed all GitHub data for user:', githubUsername);
    }

    // Clear access token
    process.env.GITHUB_ACCESS_TOKEN = undefined;
    res.status(200).send();
  } catch (error) {
    console.error('Error in removeIntegration:', error);
    res.status(500).json({ message: 'Error removing integration' });
  }
};

exports.syncData = async (req, res) => {
  try {
    const integration = await GitHubIntegration.findOne({ userId: 'default-user' });
    if (!integration || !integration.accessToken) {
      return res.status(401).json({ message: 'No GitHub integration found' });
    }

    // Initialize sync service with the access token
    const syncService = new GitHubSyncService();
    syncService.headers.Authorization = `token ${integration.accessToken}`;

    console.log('Starting GitHub data sync for user:', integration.githubUsername);

    // Start syncing user's data
    try {
      // Initialize all collections first
      await syncService.initializeCollections();
      console.log('Collections initialized');

      // Sync user's organizations
      console.log('Fetching user organizations...');
      const orgsResponse = await axios.get('https://api.github.com/user/orgs', {
        headers: {
          Authorization: `token ${integration.accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      console.log('Found organizations:', orgsResponse.data.map(org => org.login));

      // Sync each organization
      for (const org of orgsResponse.data) {
        console.log('Syncing organization:', org.login);
        await syncService.syncOrganization(org.login);
      }

      // Also sync user's own repositories with pagination
      console.log('Fetching user repositories...');
      let page = 1;
      let allRepos = [];
      let hasMoreRepos = true;

      while (hasMoreRepos) {
        const reposResponse = await axios.get(`https://api.github.com/user/repos`, {
          headers: {
            Authorization: `token ${integration.accessToken}`,
            Accept: 'application/vnd.github.v3+json'
          },
          params: {
            per_page: 100,
            page: page,
            sort: 'updated',
            direction: 'desc'
          }
        });

        const repos = reposResponse.data;
        if (repos.length === 0) {
          hasMoreRepos = false;
        } else {
          allRepos = allRepos.concat(repos);
          page++;
        }
      }

      console.log(`Found ${allRepos.length} repositories for user ${integration.githubUsername}:`, 
        allRepos.map(repo => repo.full_name));

      // Sync each repository
      for (const repo of allRepos) {
        console.log('Syncing repository:', repo.full_name);
        await syncService.syncRepository(repo.full_name);
      }

      // Update last sync time
      await GitHubIntegration.findByIdAndUpdate(integration._id, {
        lastSyncedAt: new Date()
      });

      console.log('GitHub data sync completed successfully');
      res.status(200).json({ message: 'Sync completed successfully' });
    } catch (syncError) {
      console.error('Error during GitHub data sync:', syncError);
      if (syncError.response) {
        console.error('GitHub API Error Response:', {
          status: syncError.response.status,
          data: syncError.response.data
        });
      }
      res.status(500).json({ message: 'Error during sync' });
    }
  } catch (error) {
    console.error('Error in syncData:', error);
    res.status(500).json({ message: 'Error starting sync' });
  }
}; 