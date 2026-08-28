const mqtt = require("mqtt");

const BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";

let client = null;

function getClient() {
  if (!client) {
    client = mqtt.connect(BROKER_URL);
    client.on("connect", () => {
      console.log(`Publisher connected to broker at ${BROKER_URL}`);
    });
    client.on("error", (err) => {
      console.error("Publisher connection error:", err.message);
    });
  }
  return client;
}

function publishMessage(topic, payload) {
  return new Promise((resolve, reject) => {
    const mqttClient = getClient();

    const send = () => {
      mqttClient.publish(topic, JSON.stringify(payload), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ topic, payload });
        }
      });
    };

    if (mqttClient.connected) {
      send();
    } else {
      mqttClient.once("connect", send);
    }
  });
}

module.exports = {
  publishMessage,
};
