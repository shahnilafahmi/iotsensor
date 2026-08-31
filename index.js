const express = require("express");
const sensorRoutes = require("./test/routes");
const mqttRoutes = require("./mqtt/routes");
const { startBroker } = require("./mqtt/service/Broker.service");

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoints that take a raw text body — skip JSON parsing so a non-JSON body
// (e.g. "GET_STATUS") isn't rejected with a 400 before it reaches the route.
const RAW_TEXT_PATHS = [
  "/api/mqtt/publisher/publish-text",
  "/api/mqtt/publisher/publish-response",
  "/api/mqtt/publisher/command",
];

const jsonParser = express.json();
app.use((req, res, next) => {
  if (RAW_TEXT_PATHS.includes(req.path)) return next();
  return jsonParser(req, res, next);
});

// Clean error for malformed JSON on the JSON endpoints.
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON in request body" });
  }
  return next(err);
});

app.use("/api", sensorRoutes);
app.use("/api/mqtt", mqttRoutes);

startBroker();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
