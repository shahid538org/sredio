const mongoose = require('mongoose');

const githubRepositorySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  full_name: { type: String, required: true },
  private: Boolean,
  owner: {
    login: { type: String, required: true },
    id: { type: Number, required: true },
    type: { type: String, required: true }
  },
  html_url: String,
  description: String,
  fork: Boolean,
  url: String,
  created_at: Date,
  updated_at: Date,
  pushed_at: Date,
  homepage: String,
  size: Number,
  stargazers_count: Number,
  watchers_count: Number,
  language: String,
  forks_count: Number,
  archived: Boolean,
  disabled: Boolean,
  open_issues_count: Number,
  license: {
    key: String,
    name: String,
    url: String
  },
  allow_forking: Boolean,
  is_template: Boolean,
  topics: [String],
  visibility: String,
  forks: Number,
  open_issues: Number,
  watchers: Number,
  default_branch: String,
  lastSyncedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('githubrepositories', githubRepositorySchema); 