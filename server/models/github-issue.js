const mongoose = require('mongoose');

const githubIssueSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  number: { type: Number, required: true },
  state: String,
  title: String,
  user: {
    login: String,
    id: Number,
    type: String
  },
  body: String,
  created_at: Date,
  updated_at: Date,
  closed_at: Date,
  assignee: {
    login: String,
    id: Number,
    type: String
  },
  assignees: [{
    login: String,
    id: Number,
    type: String
  }],
  labels: [{
    id: Number,
    name: String,
    color: String
  }],
  milestone: {
    id: Number,
    number: Number,
    title: String,
    state: String
  },
  locked: Boolean,
  comments: Number,
  pull_request: {
    url: String,
    html_url: String,
    diff_url: String,
    patch_url: String
  },
  repository: {
    id: Number,
    name: String,
    full_name: String
  },
  lastSyncedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('githubissues', githubIssueSchema); 