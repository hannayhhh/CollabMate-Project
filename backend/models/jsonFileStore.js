const fs = require("fs");
const path = require("path");

const ensureJsonFile = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]");
  }
};

const loadJsonArray = (filePath) => {
  ensureJsonFile(filePath);
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data || "[]");
};

const saveJsonArray = (filePath, items) => {
  ensureJsonFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
};

module.exports = {
  loadJsonArray,
  saveJsonArray,
};
