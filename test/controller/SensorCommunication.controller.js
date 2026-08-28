const sensorCommunicationService = require("../service/SensorCommunication.service");

function getAllSensors(req, res) {
  const sensors = sensorCommunicationService.getAllSensors();
  res.status(200).json(sensors);
}

function getSensorById(req, res) {
  const id = Number(req.params.id);
  const sensor = sensorCommunicationService.getSensorById(id);
  if (!sensor) {
    return res.status(404).json({ message: "Sensor data not found" });
  }
  res.status(200).json(sensor);
}

function sendSensorData(req, res) {
  const { sensorId, type, value, unit } = req.body;
  if (!sensorId || !type || value === undefined) {
    return res.status(400).json({ message: "sensorId, type and value are required" });
  }
  const record = sensorCommunicationService.registerSensorData({ sensorId, type, value, unit });
  res.status(201).json(record);
}

function deleteSensorData(req, res) {
  const id = Number(req.params.id);
  const deleted = sensorCommunicationService.deleteSensorData(id);
  if (!deleted) {
    return res.status(404).json({ message: "Sensor data not found" });
  }
  res.status(204).send();
}

module.exports = {
  getAllSensors,
  getSensorById,
  sendSensorData,
  deleteSensorData,
};
