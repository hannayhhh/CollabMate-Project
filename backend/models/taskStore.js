/**
 * @fileoverview Task data store module - handles reading and writing task data to a local JSON file.
 * @module models/taskStore
 * @version 1.0.0
 * @date 2025-06-29
 */

const path = require("path");
const { loadJsonArray, saveJsonArray } = require("./jsonFileStore");

const TASKS_FILE_PATH = path.join(__dirname, "../data/tasks.json");

/**
 * Load all tasks from the JSON file.
 * @returns {Array<Object>} Array of task objects
 */
const loadTasks = () => {
  return loadJsonArray(TASKS_FILE_PATH);
};

/**
 * Save all tasks to the JSON file.
 * @param {Array<Object>} tasks
 */
const saveTasks = (tasks) => {
  saveJsonArray(TASKS_FILE_PATH, tasks);
};

/**
 * Find a task by its ID.
 * @param {string} taskId
 * @returns {Object|null} task object or null
 */
const findTaskById = (taskId) => {
  return loadTasks().find((t) => t.taskId === taskId) || null;
};

/**
 * Upsert tasks into the local task list by taskId.
 * If a task with the same taskId exists, all fields will be replaced with the new task's values
 * except for 'createdAt' and 'creator', which are preserved from the existing task.
 * If no task with the same taskId exists, the new task is appended.
 * 
 * @param {Array<Object>} newTasks.body.required - Array of new task objects to merge
 * @returns {Array<Object>} Updated array of tasks after upsert operation
 */
const upsertTasks = (newTasks) => {
  const tasks = loadTasks();
  const indexMap = new Map(tasks.map((task, i) => [task.taskId, i]));

  newTasks.forEach(newTask => {
    const existingIndex = indexMap.get(newTask.taskId);
    if (existingIndex !== undefined) {
      tasks[existingIndex] = {
        ...tasks[existingIndex],
        ...newTask,
        createdAt: tasks[existingIndex].createdAt,
        creator: tasks[existingIndex].creator
      };
    } else {
      tasks.push(newTask);
    }
  });
  
  saveTasks(tasks)
};

module.exports = {
  loadTasks,
  saveTasks,
  findTaskById,
  upsertTasks,
};
