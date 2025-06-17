const mongoose = require('mongoose');

const githubIntegrationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  githubUsername: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  connectedAt: {
    type: Date,
    default: Date.now
  },
  lastSyncedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('githubintegrations', githubIntegrationSchema); 