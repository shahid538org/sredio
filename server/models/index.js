const mongoose = require('mongoose');

// Import all models
require('./github-integration');
require('./github-organization');
require('./github-repository');
require('./github-commit');
require('./github-pull-request');
require('./github-issue');
require('./github-issue-changelog');
require('./github-organization-member');

// Log registered models
console.log('Registered Mongoose models:', Object.keys(mongoose.models));

// Export mongoose for convenience
module.exports = mongoose; 