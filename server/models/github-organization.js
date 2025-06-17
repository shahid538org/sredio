const mongoose = require('mongoose');

const githubOrganizationSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  login: { type: String, required: true },
  url: { type: String, required: true },
  description: String,
  name: String,
  company: String,
  blog: String,
  location: String,
  email: String,
  twitter_username: String,
  is_verified: Boolean,
  has_organization_projects: Boolean,
  has_repository_projects: Boolean,
  public_repos: Number,
  public_gists: Number,
  followers: Number,
  following: Number,
  created_at: Date,
  updated_at: Date,
  lastSyncedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('githuborganizations', githubOrganizationSchema); 