const axios = require('axios');
const mongoose = require('mongoose');
const GitHubIntegration = require('../models/github-integration');
const GitHubOrganization = require('../models/github-organization');
const GitHubRepository = require('../models/github-repository');
const GitHubCommit = require('../models/github-commit');
const GitHubPullRequest = require('../models/github-pull-request');
const GitHubIssue = require('../models/github-issue');
const GitHubIssueChangelog = require('../models/github-issue-changelog');
const GitHubOrganizationMember = require('../models/github-organization-member');

class GitHubSyncService {
  constructor() {
    this.baseUrl = 'https://api.github.com';
    this.headers = {
      Accept: 'application/vnd.github.v3+json'
    };
  }

  async initializeCollections() {
    try {
      console.log('Initializing collections...');
      
      // Initialize organizations collection
      await GitHubOrganization.findOneAndUpdate(
        { id: -1 }, // Special ID for initialization document
        { 
          id: -1,
          login: 'initialization',
          url: 'https://github.com',
          lastSyncedAt: new Date()
        },
        { upsert: true }
      );

      // Initialize repositories collection
      await GitHubRepository.findOneAndUpdate(
        { id: -1 },
        {
          id: -1,
          name: 'initialization',
          full_name: 'initialization/repo',
          owner: {
            login: 'initialization',
            id: -1,
            type: 'User'
          },
          lastSyncedAt: new Date()
        },
        { upsert: true }
      );

      // Initialize commits collection
      await GitHubCommit.findOneAndUpdate(
        { sha: 'initialization' },
        {
          sha: 'initialization',
          repository: {
            id: -1,
            name: 'initialization',
            full_name: 'initialization/repo'
          },
          lastSyncedAt: new Date()
        },
        { upsert: true }
      );

      // Initialize pull requests collection
      await GitHubPullRequest.findOneAndUpdate(
        { id: -1 },
        {
          id: -1,
          number: -1,
          repository: {
            id: -1,
            name: 'initialization',
            full_name: 'initialization/repo'
          },
          lastSyncedAt: new Date()
        },
        { upsert: true }
      );

      // Initialize issues collection
      await GitHubIssue.findOneAndUpdate(
        { id: -1 },
        {
          id: -1,
          number: -1,
          repository: {
            id: -1,
            name: 'initialization',
            full_name: 'initialization/repo'
          },
          lastSyncedAt: new Date()
        },
        { upsert: true }
      );

      // Initialize issue changelogs collection
      await GitHubIssueChangelog.findOneAndUpdate(
        { id: -1 },
        {
          id: -1,
          issue_id: -1,
          lastSyncedAt: new Date()
        },
        { upsert: true }
      );

      // Initialize organization members collection
      await GitHubOrganizationMember.findOneAndUpdate(
        { id: -1 },
        {
          id: -1,
          login: 'initialization',
          organization: {
            id: -1,
            login: 'initialization'
          },
          lastSyncedAt: new Date()
        },
        { upsert: true }
      );

      console.log('Collections initialized successfully');
    } catch (error) {
      console.error('Error initializing collections:', error);
      throw error;
    }
  }

  async updateHeaders() {
    const integration = await GitHubIntegration.findOne({ userId: 'default-user' });
    if (!integration || !integration.accessToken) {
      throw new Error('No GitHub access token found. Please authenticate first.');
    }
    this.headers.Authorization = `token ${integration.accessToken}`;
  }

  async syncOrganization(orgName) {
    try {
      console.log(`Starting sync for organization: ${orgName}`);
      
      // Get organization details
      const orgResponse = await axios.get(`${this.baseUrl}/orgs/${orgName}`, { headers: this.headers });
      const orgData = orgResponse.data;
      console.log(`Retrieved organization data for: ${orgName}`);

      // Save organization
      const organization = await GitHubOrganization.findOneAndUpdate(
        { id: orgData.id },
        {
          id: orgData.id,
          login: orgData.login,
          url: orgData.url,
          description: orgData.description,
          name: orgData.name,
          company: orgData.company,
          blog: orgData.blog,
          location: orgData.location,
          email: orgData.email,
          twitter_username: orgData.twitter_username,
          is_verified: orgData.is_verified,
          has_organization_projects: orgData.has_organization_projects,
          has_repository_projects: orgData.has_repository_projects,
          public_repos: orgData.public_repos,
          public_gists: orgData.public_gists,
          followers: orgData.followers,
          following: orgData.following,
          created_at: orgData.created_at,
          updated_at: orgData.updated_at,
          lastSyncedAt: new Date()
        },
        { upsert: true, new: true }
      );
      console.log(`Saved organization data for: ${orgName}`);

      // Get organization members with pagination
      console.log(`Fetching members for organization: ${orgName}`);
      let page = 1;
      let allMembers = [];
      let hasMoreMembers = true;

      while (hasMoreMembers) {
        const membersResponse = await axios.get(`${this.baseUrl}/orgs/${orgName}/members`, {
          headers: this.headers,
          params: {
            per_page: 100,
            page: page
          }
        });
        const members = membersResponse.data;
        allMembers = allMembers.concat(members);
        hasMoreMembers = members.length === 100;
        page++;
      }

      // Save organization members
      for (const memberData of allMembers) {
        await GitHubOrganizationMember.findOneAndUpdate(
          { id: memberData.id },
          {
            id: memberData.id,
            login: memberData.login,
            organization: {
              id: orgData.id,
              login: orgData.login
            },
            role: memberData.role,
            state: memberData.state,
            created_at: memberData.created_at,
            lastSyncedAt: new Date()
          },
          { upsert: true, new: true }
        );
      }
      console.log(`Saved ${allMembers.length} members for organization: ${orgName}`);

      // Get repositories with pagination
      console.log(`Fetching repositories for organization: ${orgName}`);
      page = 1;
      let allRepos = [];
      let hasMoreRepos = true;

      while (hasMoreRepos) {
        const reposResponse = await axios.get(`${this.baseUrl}/orgs/${orgName}/repos`, {
          headers: this.headers,
          params: {
            per_page: 100,
            page: page,
            type: 'all' // Include all repository types
          }
        });
      const repos = reposResponse.data;
        allRepos = allRepos.concat(repos);
        hasMoreRepos = repos.length === 100;
        page++;
      }
      console.log(`Found ${allRepos.length} repositories for organization: ${orgName}`);

      // Sync each repository
      for (const repo of allRepos) {
        try {
        await this.syncRepository(repo.full_name);
        } catch (repoError) {
          console.error(`Error syncing repository ${repo.full_name}:`, repoError);
          // Continue with next repository instead of failing the entire sync
          continue;
        }
      }

      return organization;
    } catch (error) {
      console.error(`Error syncing organization ${orgName}:`, error);
      if (error.response) {
        console.error('GitHub API Error Response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }

  async syncRepository(repoFullName) {
    try {
      console.log(`Starting sync for repository: ${repoFullName}`);

      // Get repository details
      const repoResponse = await axios.get(`${this.baseUrl}/repos/${repoFullName}`, { headers: this.headers });
      const repoData = repoResponse.data;
      console.log(`Retrieved repository data for: ${repoFullName}`);

      // Save repository
      const repository = await GitHubRepository.findOneAndUpdate(
        { id: repoData.id },
        {
          id: repoData.id,
          name: repoData.name,
          full_name: repoData.full_name,
          private: repoData.private,
          owner: {
            login: repoData.owner.login,
            id: repoData.owner.id,
            type: repoData.owner.type
          },
          description: repoData.description,
          fork: repoData.fork,
          created_at: repoData.created_at,
          updated_at: repoData.updated_at,
          pushed_at: repoData.pushed_at,
          homepage: repoData.homepage,
          size: repoData.size,
          stargazers_count: repoData.stargazers_count,
          watchers_count: repoData.watchers_count,
          language: repoData.language,
          has_issues: repoData.has_issues,
          has_projects: repoData.has_projects,
          has_downloads: repoData.has_downloads,
          has_wiki: repoData.has_wiki,
          has_pages: repoData.has_pages,
          has_discussions: repoData.has_discussions,
          forks_count: repoData.forks_count,
          archived: repoData.archived,
          disabled: repoData.disabled,
          open_issues_count: repoData.open_issues_count,
          license: repoData.license,
          allow_forking: repoData.allow_forking,
          is_template: repoData.is_template,
          web_commit_signoff_required: repoData.web_commit_signoff_required,
          topics: repoData.topics,
          visibility: repoData.visibility,
          forks: repoData.forks,
          open_issues: repoData.open_issues,
          watchers: repoData.watchers,
          default_branch: repoData.default_branch,
          permissions: repoData.permissions,
          lastSyncedAt: new Date()
        },
        { upsert: true, new: true }
      );
      console.log(`Saved repository data for: ${repoFullName}`);

      // Sync repository data
      await Promise.all([
        this.syncCommits(repoData),
        this.syncPullRequests(repoFullName),
        this.syncIssues(repoFullName)
      ]);

      return repository;
    } catch (error) {
      console.error(`Error syncing repository ${repoFullName}:`, error);
      if (error.response) {
        console.error('GitHub API Error Response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }

  async syncCommits(repo) {
    try {
      console.log(`Syncing commits for repository: ${repo.full_name}`);
      
      // Check if repository exists and has commits
      try {
        const commitsResponse = await axios.get(`${this.baseUrl}/repos/${repo.full_name}/commits`, {
          headers: this.headers,
          params: {
            per_page: 100
          }
        });
        
      const commits = commitsResponse.data;

        if (!commits || commits.length === 0) {
          console.log(`No commits found for repository: ${repo.full_name}`);
          return;
        }

        // Process each commit
        for (const commit of commits) {
          try {
            // Ensure all required fields are present with default values
            const commitData = {
              sha: commit.sha || '',
              node_id: commit.node_id || '',
              commit: {
                message: commit.commit?.message || '',
                author: {
                  name: commit.commit?.author?.name || '',
                  email: commit.commit?.author?.email || '',
                  date: commit.commit?.author?.date || new Date().toISOString()
                },
                committer: {
                  name: commit.commit?.committer?.name || '',
                  email: commit.commit?.committer?.email || '',
                  date: commit.commit?.committer?.date || new Date().toISOString()
                }
              },
              url: commit.url || '',
              html_url: commit.html_url || '',
              comments_url: commit.comments_url || '',
              author: commit.author ? {
                login: commit.author.login || '',
                id: commit.author.id || 0,
                node_id: commit.author.node_id || '',
                avatar_url: commit.author.avatar_url || '',
                gravatar_id: commit.author.gravatar_id || '',
                url: commit.author.url || '',
                html_url: commit.author.html_url || '',
                followers_url: commit.author.followers_url || '',
                following_url: commit.author.following_url || '',
                gists_url: commit.author.gists_url || '',
                starred_url: commit.author.starred_url || '',
                subscriptions_url: commit.author.subscriptions_url || '',
                organizations_url: commit.author.organizations_url || '',
                repos_url: commit.author.repos_url || '',
                events_url: commit.author.events_url || '',
                received_events_url: commit.author.received_events_url || '',
                type: commit.author.type || '',
                site_admin: commit.author.site_admin || false
              } : null,
              committer: commit.committer ? {
                login: commit.committer.login || '',
                id: commit.committer.id || 0,
                node_id: commit.committer.node_id || '',
                avatar_url: commit.committer.avatar_url || '',
                gravatar_id: commit.committer.gravatar_id || '',
                url: commit.committer.url || '',
                html_url: commit.committer.html_url || '',
                followers_url: commit.committer.followers_url || '',
                following_url: commit.committer.following_url || '',
                gists_url: commit.committer.gists_url || '',
                starred_url: commit.committer.starred_url || '',
                subscriptions_url: commit.committer.subscriptions_url || '',
                organizations_url: commit.committer.organizations_url || '',
                repos_url: commit.committer.repos_url || '',
                events_url: commit.committer.events_url || '',
                received_events_url: commit.committer.received_events_url || '',
                type: commit.committer.type || '',
                site_admin: commit.committer.site_admin || false
              } : null,
              parents: (commit.parents || []).map(parent => ({
                sha: parent.sha || '',
                url: parent.url || '',
                html_url: parent.html_url || ''
              })),
            repository: {
                id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                private: repo.private,
                owner: {
                  login: repo.owner.login,
                  id: repo.owner.id
                }
            },
            lastSyncedAt: new Date()
            };

            // Update or insert the commit
            await GitHubCommit.findOneAndUpdate(
              { sha: commit.sha },
              commitData,
          { upsert: true, new: true }
        );
          } catch (commitError) {
            console.error(`Error processing commit ${commit.sha}:`, commitError);
            // Continue with next commit
          }
        }
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`Repository ${repo.full_name} is empty, skipping commits sync`);
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error(`Error syncing commits for ${repo.full_name}:`, error);
      throw error;
    }
  }

  async syncPullRequests(repoFullName) {
    try {
      console.log(`Starting sync for pull requests in repository: ${repoFullName}`);

      // Get pull requests
      const prsResponse = await axios.get(`${this.baseUrl}/repos/${repoFullName}/pulls`, { headers: this.headers });
      const prs = prsResponse.data;
      console.log(`Found ${prs.length} pull requests for repository: ${repoFullName}`);

      // Save pull requests
      for (const prData of prs) {
        await GitHubPullRequest.findOneAndUpdate(
          { id: prData.id },
          {
            id: prData.id,
            number: prData.number,
            state: prData.state,
            title: prData.title,
            user: {
              login: prData.user.login,
              id: prData.user.id,
              type: prData.user.type
            },
            body: prData.body,
            created_at: prData.created_at,
            updated_at: prData.updated_at,
            closed_at: prData.closed_at,
            merged_at: prData.merged_at,
            merge_commit_sha: prData.merge_commit_sha,
            assignee: prData.assignee ? {
              login: prData.assignee.login,
              id: prData.assignee.id,
              type: prData.assignee.type
            } : null,
            assignees: prData.assignees.map(assignee => ({
              login: assignee.login,
              id: assignee.id,
              type: assignee.type
            })),
            requested_reviewers: prData.requested_reviewers.map(reviewer => ({
              login: reviewer.login,
              id: reviewer.id,
              type: reviewer.type
            })),
            requested_teams: prData.requested_teams,
            labels: prData.labels,
            milestone: prData.milestone,
            draft: prData.draft,
            commits_url: prData.commits_url,
            review_comments_url: prData.review_comments_url,
            review_comment_url: prData.review_comment_url,
            comments_url: prData.comments_url,
            statuses_url: prData.statuses_url,
            head: prData.head,
            base: prData.base,
            repository: {
              id: prData.repository.id,
              name: prData.repository.name,
              full_name: prData.repository.full_name
            },
            author_association: prData.author_association,
            merged: prData.merged,
            mergeable: prData.mergeable,
            mergeable_state: prData.mergeable_state,
            comments: prData.comments,
            review_comments: prData.review_comments,
            commits: prData.commits,
            additions: prData.additions,
            deletions: prData.deletions,
            changed_files: prData.changed_files,
            lastSyncedAt: new Date()
          },
          { upsert: true, new: true }
        );
      }
      console.log(`Saved ${prs.length} pull requests for repository: ${repoFullName}`);
    } catch (error) {
      console.error(`Error syncing pull requests for ${repoFullName}:`, error);
      if (error.response) {
        console.error('GitHub API Error Response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }

  async syncIssues(repoFullName) {
    try {
      console.log(`Starting sync for issues in repository: ${repoFullName}`);

      // Get issues
      const issuesResponse = await axios.get(`${this.baseUrl}/repos/${repoFullName}/issues`, { headers: this.headers });
      const issues = issuesResponse.data;
      console.log(`Found ${issues.length} issues for repository: ${repoFullName}`);

      // Save issues and their changelogs
      for (const issueData of issues) {
        // Save issue
        const issue = await GitHubIssue.findOneAndUpdate(
          { id: issueData.id },
          {
            id: issueData.id,
            number: issueData.number,
            state: issueData.state,
            title: issueData.title,
            user: {
              login: issueData.user.login,
              id: issueData.user.id,
              type: issueData.user.type
            },
            body: issueData.body,
            created_at: issueData.created_at,
            updated_at: issueData.updated_at,
            closed_at: issueData.closed_at,
            assignee: issueData.assignee ? {
              login: issueData.assignee.login,
              id: issueData.assignee.id,
              type: issueData.assignee.type
            } : null,
            assignees: issueData.assignees.map(assignee => ({
              login: assignee.login,
              id: assignee.id,
              type: assignee.type
            })),
            labels: issueData.labels,
            milestone: issueData.milestone,
            locked: issueData.locked,
            comments: issueData.comments,
            pull_request: issueData.pull_request,
            repository: {
              id: issueData.repository.id,
              name: issueData.repository.name,
              full_name: issueData.repository.full_name
            },
            lastSyncedAt: new Date()
          },
          { upsert: true, new: true }
        );

        // Get issue events (changelog)
        const eventsResponse = await axios.get(`${this.baseUrl}/repos/${repoFullName}/issues/${issueData.number}/events`, { headers: this.headers });
        const events = eventsResponse.data;

        // Save changelog entries
        for (const eventData of events) {
          await GitHubIssueChangelog.findOneAndUpdate(
            { id: eventData.id },
            {
              id: eventData.id,
              issue_id: issue.id,
              event: eventData.event,
              commit_id: eventData.commit_id,
              commit_url: eventData.commit_url,
              created_at: eventData.created_at,
              actor: {
                login: eventData.actor.login,
                id: eventData.actor.id,
                type: eventData.actor.type
              },
              label: eventData.label,
              assignee: eventData.assignee ? {
                login: eventData.assignee.login,
                id: eventData.assignee.id,
                type: eventData.assignee.type
              } : null,
              assigner: eventData.assigner ? {
                login: eventData.assigner.login,
                id: eventData.assigner.id,
                type: eventData.assigner.type
              } : null,
              review_requester: eventData.review_requester ? {
                login: eventData.review_requester.login,
                id: eventData.review_requester.id,
                type: eventData.review_requester.type
              } : null,
              requested_reviewer: eventData.requested_reviewer ? {
                login: eventData.requested_reviewer.login,
                id: eventData.requested_reviewer.id,
                type: eventData.requested_reviewer.type
              } : null,
              dismissal_review: eventData.dismissal_review,
              lastSyncedAt: new Date()
            },
            { upsert: true, new: true }
          );
        }
      }
      console.log(`Saved ${issues.length} issues and their changelogs for repository: ${repoFullName}`);
    } catch (error) {
      console.error(`Error syncing issues for ${repoFullName}:`, error);
      if (error.response) {
        console.error('GitHub API Error Response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }
}

// Export the class properly
module.exports = GitHubSyncService; 