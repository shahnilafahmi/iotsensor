const sensors = [];

function getAllSensors() {
  return sensors;
}

function getSensorById(id) {
  return sensors.find((sensor) => sensor.id === id);
}

function registerSensorData(data) {
  const record = {
    id: sensors.length + 1,
    sensorId: data.sensorId,
    type: data.type,
    value: data.value,
    unit: data.unit,
    timestamp: new Date().toISOString(),
  };
  sensors.push(record);
  return record;
}

function deleteSensorData(id) {
  const index = sensors.findIndex((sensor) => sensor.id === id);
  if (index === -1) return false;
  sensors.splice(index, 1);
  return true;
}

module.exports = {
  getAllSensors,
  getSensorById,
  registerSensorData,
  deleteSensorData,
};
