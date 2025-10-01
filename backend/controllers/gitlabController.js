/**
 * @fileoverview GitLab OAuth Controller - handles OAuth login and callback to store user access token.
 * @module controllers/gitlabController
 * @version 1.0.0
 * @date 2025-07-20
 */

const axios = require("axios");
const querystring = require("querystring");
const { loadUsers, saveUsers, findUserById } = require("../models/userStore");
const { upsertTasks } = require("../models/taskStore");

const CLIENT_ID = process.env.GITLAB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITLAB_CLIENT_SECRET;
const REDIRECT_URI = process.env.GITLAB_REDIRECT_URI;
const GITLAB_OAUTH_URL = "https://gitlab.com/oauth/authorize";
const GITLAB_TOKEN_URL = "https://gitlab.com/oauth/token";
const GITLAB_API_URL = process.env.GITLAB_API_URL;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * Redirects the user to GitLab OAuth login page.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */

const initiateGitlabLogin = (req, res) => {
  const state = req.userId;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    state,
    scope: "read_user read_api read_repository",
  });

  return res.redirect(`${GITLAB_OAUTH_URL}?${params.toString()}`);
};

/**
 * Handles GitLab OAuth callback and stores access token for the user.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
const handleGitlabCallback = async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).json({ message: "Missing code or state" });
  }

  try {
    const tokenRes = await axios.post(
      GITLAB_TOKEN_URL,
      querystring.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenRes.data.access_token;
    const users = loadUsers();
    const user = users.find((u) => u.userId === state);
    if (!user) return res.status(404).json({ message: "User not found" });

    const gitlabUserRes = await axios.get(`${GITLAB_API_URL}/user`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const gitlabUserId = gitlabUserRes.data.id;

    user.gitlabAccessToken = accessToken;
    user.gitlabUserId = gitlabUserId;
    saveUsers(users);

    return res.redirect(`${FRONTEND_URL}/gitlab?gitlab=success`);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "GitLab OAuth failed", error: err.message });
  }
};

/**
 * Retrieves GitLab projects associated with the current user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
const getUserProjects = async (req, res) => {
  try {
    const user = findUserById(req.userId);
    if (!user || !user.gitlabAccessToken) {
      return res.status(401).json({ message: "GitLab not linked" });
    }
    const response = await axios.get(
      `${GITLAB_API_URL}/projects?membership=true`,
      {
        headers: { Authorization: `Bearer ${user.gitlabAccessToken}` },
      }
    );
    return res.status(200).json(response.data);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to fetch projects", error: err.message });
  }
};

/**
 * Fetches the GitLab user profile using access token.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
const getGitlabUser = async (req, res) => {
  try {
    const user = findUserById(req.userId);
    if (!user || !user.gitlabAccessToken) {
      return res.status(401).json({ message: "GitLab not linked" });
    }

    const response = await axios.get(`${GITLAB_API_URL}/user`, {
      headers: { Authorization: `Bearer ${user.gitlabAccessToken}` },
    });

    return res.status(200).json(response.data);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch GitLab user info",
      error: err.message,
    });
  }
};

/**
 * Unlinks GitLab access from the current user's profile by clearing the access token.
 * - Requires userId to be set in req
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
const unlinkGitlab = (req, res) => {
  const user = findUserById(req.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.gitlabAccessToken = undefined;
  saveUsers(loadUsers()); // reload + save ensures no conflict with other users
  saveUsers([user, ...loadUsers().filter((u) => u.userId !== user.userId)]); // overwrite that user
  return res.status(200).json({ message: "GitLab unlinked successfully" });
};

/**
 * Get simple project list from GitLab (id + name only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
 const getProjectNameList = async (req, res) => {
   const user = findUserById(req.userId);
   if (!user || !user.gitlabAccessToken) {
     return res.status(401).json({ message: 'GitLab not linked' });
   }
   try {
     const { data } = await axios.get(
       `${process.env.GITLAB_API_URL}/projects?membership=true&simple=true`,
       { headers: { Authorization: `Bearer ${user.gitlabAccessToken}` } }
     );
     const projects = data.map(p => ({ id: p.id, name: p.name }));
     return res.status(200).json({ projects });
   } catch (err) {
     return res.status(500).json({ error: 'Failed to fetch GitLab projects' });
   }
 };

/**
 * Fetch issues of a GitLab project and convert to local task format
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {200} List of formatted tasks from GitLab issues
 * @returns {401} Unauthorized (missing token or GitLab not linked)
 * @returns {500} GitLab API error
 */
const getProjectIssuesAsTasks = async (req, res) => {
  const { projectId } = req.params;
  const user = findUserById(req.userId);
  if (!user || !user.gitlabAccessToken) {
    return res.status(401).json({ message: "GitLab not linked" });
  }

  try {
    const response = await axios.get(
      `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues`,
      {
        headers: {
          Authorization: `Bearer ${user.gitlabAccessToken}`,
        },
        params: {
          per_page: 50, //can increase or paginate
        },
      }
    );

    const now = new Date().toISOString();

    const users = loadUsers(); 

    const formattedTasks = response.data.map((issue) => {
      const assigneeIds = [];

      if (Array.isArray(issue.assignees)) {
        issue.assignees.forEach((assignee) => {
          const matchedUser = users.find((u) => u.gitlabUserId === assignee.id);
          if (matchedUser) {
            assigneeIds.push(matchedUser.userId);
          }
        });
      } else if (issue.assignee) {
        const matchedUser = users.find((u) => u.gitlabUserId === issue.assignee.id);
        if (matchedUser) {
          assigneeIds.push(matchedUser.userId);
        }
      }

      return {
        taskId: `gitlab-${issue.id}`,
        title: issue.title,
        description: issue.description || "",
        deadline: issue.due_date || null,
        status: issue.state === "closed" ? "Done" : "To Do",
        userIds: assigneeIds,
        gitlabIssueId: issue.id,

        gitlabIssueIid: issue.iid,
        gitlabProjectId: projectId,
        createdAt: issue.created_at || now,
        updatedAt: issue.updated_at || now,
        creator: req.userId, 
      };
    });

    upsertTasks(formattedTasks);

    return res.status(200).json({
      message: "GitLab issues converted to tasks",
      tasks: formattedTasks,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch GitLab issues",
      error: err.message,
    });
  }
};

/**
 * Get all issues under a GitLab project (only basic info).
 * @param {string} projectId.path.required - GitLab project ID
 * @returns {200} List of issue summaries
 * @returns {401} Unauthorized or GitLab not linked
 * @returns {500} Failed to fetch issues
 */
const getProjectIssueIDLists = async (req, res) => {
  const { projectId } = req.params;
  const user = findUserById(req.userId);

  if (!user || !user.gitlabAccessToken) {
    return res.status(401).json({ message: "GitLab not linked" });
  }

  try {
    const response = await axios.get(
      `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues`,
      {
        headers: { Authorization: `Bearer ${user.gitlabAccessToken}` },
        params: { per_page: 100 }, // optional
      }
    );

    const simplified = response.data.map((issue) => ({
      issueId: issue.id,
      title: issue.title,
      state: issue.state,
      issueIid: issue.iid,
    }));

    return res.status(200).json(simplified);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch issues",
      error: err.message,
    });
  }
};

/**
 * Import a single GitLab issue into our local task system.
 * @param {string} projectId.path.required - GitLab project ID
 * @param {string} issueIid.path.required - GitLab issue IID
 * @returns {201} Task created from issue
 * @returns {401} Unauthorized
 * @returns {404} Issue not found
 * @returns {500} GitLab API or local storage error
 */
const getSingleProjectIssue = async (req, res) => {
  const { projectId, issueIid } = req.params;
  const user = findUserById(req.userId);

  if (!user || !user.gitlabAccessToken) {
    return res.status(401).json({ message: "GitLab not linked" });
  }

  try {
    const response = await axios.get(
      `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}`,
      {
        headers: { Authorization: `Bearer ${user.gitlabAccessToken}` },
      }
    );

    const issue = response.data;
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const now = new Date().toISOString();

    const users = loadUsers();
    const assigneeIds = [];
    if (Array.isArray(issue.assignees)) {
      issue.assignees.forEach((assignee) => {
        const matchedUser = users.find((u) => u.gitlabUserId === assignee.id);
        if (matchedUser) {
          assigneeIds.push(matchedUser.userId);
        }
      });
    } else if (issue.assignee) {
      const matchedUser = users.find((u) => u.gitlabUserId === issue.assignee.id);
      if (matchedUser) {
        assigneeIds.push(matchedUser.userId);
      }
    }

    const newTask = {
      taskId: `gitlab-${issue.id}`,
      title: issue.title,
      description: issue.description || "",
      deadline: issue.due_date || null,
      status: issue.state === "closed" ? "Done" : "To Do",
      userIds: assigneeIds,
      gitlabIssueId: issue.id,
      gitlabIssueIid: issue.iid,
      gitlabProjectId: projectId,
      createdAt: issue.created_at || now,
      updatedAt: issue.updated_at || now,
      creator: req.userId, 
    };

    upsertTasks([newTask])

    return res.status(201).json({ message: "Issue imported as task", task: newTask });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to import issue",
      error: err.message,
    });
  }
};


module.exports = {
  initiateGitlabLogin,
  handleGitlabCallback,
  getUserProjects,
  getGitlabUser,
  unlinkGitlab,
  getProjectNameList,
  getProjectIssuesAsTasks,
  getProjectIssueIDLists,
  getSingleProjectIssue,
};
