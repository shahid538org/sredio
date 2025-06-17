const mongoose = require('mongoose');

const githubPullRequestSchema = new mongoose.Schema({
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
  merged_at: Date,
  merge_commit_sha: String,
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
  requested_reviewers: [{
    login: String,
    id: Number,
    type: String
  }],
  requested_teams: [{
    name: String,
    id: Number,
    slug: String
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
  draft: Boolean,
  commits_url: String,
  review_comments_url: String,
  review_comment_url: String,
  comments_url: String,
  statuses_url: String,
  head: {
    label: String,
    ref: String,
    sha: String,
    user: {
      login: String,
      id: Number,
      type: String
    },
    repo: {
      id: Number,
      name: String,
      full_name: String
    }
  },
  base: {
    label: String,
    ref: String,
    sha: String,
    user: {
      login: String,
      id: Number,
      type: String
    },
    repo: {
      id: Number,
      name: String,
      full_name: String
    }
  },
  repository: {
    id: Number,
    name: String,
    full_name: String
  },
  author_association: String,
  merged: Boolean,
  mergeable: Boolean,
  mergeable_state: String,
  comments: Number,
  review_comments: Number,
  commits: Number,
  additions: Number,
  deletions: Number,
  changed_files: Number,
  lastSyncedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('githubpullrequests', githubPullRequestSchema); 