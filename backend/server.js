/**
 * @fileoverview Monitoring the port separately to avoid conflicts between the test port and the real port
 * @date 2025-08-11
 * @version 1.0.1
 */

const app = require("./app");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
