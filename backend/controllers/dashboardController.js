/**
 * @fileoverview Dashboard controller - provides task calendar and task summary statistics for the dashboard.
 * @module controllers/dashboardController
 * @version 1.0.0
 * @date 2025-06-29
 */

const { loadTasks, findTaskById } = require("../models/taskStore");

/**
 * Get all task deadlines (used to populate calendar).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
const getCalendarData = (req, res) => {
  const tasks = loadTasks();

  const calendarData = tasks.map((task) => ({
    taskId: task.taskId,
    title: task.title,
    deadline: task.deadline,
    status: task.status,
  }));

  res.json(calendarData);
};

/**
 * Get total task summary: completed vs remaining
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
const getTaskSummary = (req, res) => {
  const tasks = loadTasks();

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Done").length;
  const remaining = total - completed;

  res.json({
    total,
    completed,
    remaining,
  });
};

/**
 * Get progress of a specific task by ID (used for Task 1 chart etc.)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
const getTaskProgress = (req, res) => {
  const { taskId } = req.params;
  const task = findTaskById(taskId);

  if (!task) return res.status(404).json({ error: "Task not found" });

  const progress = task.status === "Done" 
    ? 100 
    : (task.status === "In Progress" ? 50 : 0);

  res.json({
    taskId: task.taskId,
    title: task.title,
    status: task.status,
    progress_percent: progress,
  });
};

module.exports = {
  getCalendarData,
  getTaskSummary,
  getTaskProgress,
};
