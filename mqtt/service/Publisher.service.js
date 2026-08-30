const mqtt = require("mqtt");

// External broker address, e.g.
//   mqtt://localhost:1883                      (local Mosquitto)
//   mqtts://user:pass@xxx.emqxsl.com:8883      (EMQX Cloud / TLS)
const BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";

// Credentials can be in the URL above or supplied separately here.
const USERNAME = process.env.MQTT_USERNAME;
const PASSWORD = process.env.MQTT_PASSWORD;

// Publish as retained by default so the last message per topic is kept by the
// broker (visible in the EMQX "Retained Messages" tab) and delivered to clients
// that subscribe afterwards. Override per request or with MQTT_RETAIN=false.
const DEFAULT_RETAIN = process.env.MQTT_RETAIN !== "false";
const DEFAULT_QOS = Number(process.env.MQTT_QOS || 1);

let client = null;

function getClient() {
  if (!client) {
    const options = {
      clientId: `iotsensor-publisher-${Math.random().toString(16).slice(2, 10)}`,
    };
    if (USERNAME) options.username = USERNAME;
    if (PASSWORD) options.password = PASSWORD;

    client = mqtt.connect(BROKER_URL, options);
    client.on("connect", () => {
      console.log(`Publisher connected to broker at ${BROKER_URL}`);
    });
    client.on("error", (err) => {
      console.error("Publisher connection error:", err.message);
    });
  }
  return client;
}

function publishMessage(
  topic,
  payload,
  { qos = DEFAULT_QOS, retain = DEFAULT_RETAIN } = {}
) {
  return new Promise((resolve, reject) => {
    const mqttClient = getClient();
    const body = typeof payload === "string" ? payload : JSON.stringify(payload);

    const send = () => {
      mqttClient.publish(topic, body, { qos, retain }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ topic, payload, qos, retain });
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
