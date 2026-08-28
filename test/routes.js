const express = require("express");
const sensorCommunicationController = require("./controller/SensorCommunication.controller");

const router = express.Router();

router.get("/sensors", sensorCommunicationController.getAllSensors);
router.get("/sensors/:id", sensorCommunicationController.getSensorById);
router.post("/sensors", sensorCommunicationController.sendSensorData);
router.delete("/sensors/:id", sensorCommunicationController.deleteSensorData);

module.exports = router;
