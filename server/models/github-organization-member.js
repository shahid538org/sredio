const mongoose = require('mongoose');

const githubOrganizationMemberSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  login: { type: String, required: true },
  organization: {
    id: { type: Number, required: true },
    login: { type: String, required: true }
  },
  role: String,
  state: String,
  created_at: Date,
  lastSyncedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('githuborganizationmembers', githubOrganizationMemberSchema); 