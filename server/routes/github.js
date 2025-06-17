const express = require('express');
const router = express.Router();
const githubAuthController = require('../controllers/github-auth');
const githubSyncController = require('../controllers/github-sync.controller');
const githubDataController = require('../controllers/github-data.controller');

// Auth routes
router.get('/auth-url', githubAuthController.getAuthUrl);
router.get('/callback', githubAuthController.handleCallback);
router.get('/status', githubAuthController.getIntegrationStatus);
router.delete('/remove', githubAuthController.removeIntegration);
router.post('/sync', githubAuthController.syncData);

// Sync routes
router.post('/sync/organization/:orgName', githubSyncController.syncOrganization);
router.post('/sync/repository/:repoFullName', githubSyncController.syncRepository);

// Data routes
router.get('/collections', githubDataController.getCollections);
router.get('/schema/:collection', githubDataController.getCollectionSchema);
router.get('/data/:collection', githubDataController.getData);

module.exports = router; 