const express = require("express");
const sensorRoutes = require("./test/routes");
const mqttRoutes = require("./mqtt/routes");
const { startBroker } = require("./mqtt/service/Broker.service");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api", sensorRoutes);
app.use("/api/mqtt", mqttRoutes);

startBroker();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
