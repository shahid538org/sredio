const mongoose = require('mongoose');

const githubIssueChangelogSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  issue_id: { type: Number, required: true },
  event: String,
  commit_id: String,
  commit_url: String,
  created_at: Date,
  actor: {
    login: String,
    id: Number,
    type: String
  },
  label: {
    name: String,
    color: String
  },
  assignee: {
    login: String,
    id: Number,
    type: String
  },
  assigner: {
    login: String,
    id: Number,
    type: String
  },
  review_requester: {
    login: String,
    id: Number,
    type: String
  },
  requested_reviewer: {
    login: String,
    id: Number,
    type: String
  },
  dismissal_review: {
    state: String,
    review_id: Number,
    dismissal_message: String
  },
  lastSyncedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('githubissuechangelogs', githubIssueChangelogSchema); 