const mqtt = require("mqtt");

// External broker address, e.g.
//   mqtt://localhost:1883                      (local Mosquitto)
//   mqtts://user:pass@xxx.emqxsl.com:8883      (EMQX Cloud / TLS)
const BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";

// Credentials can be in the URL above or supplied separately here.
const USERNAME = process.env.MQTT_USERNAME;
const PASSWORD = process.env.MQTT_PASSWORD;

// Topic filters the listener subscribes to (comma-separated).
// Default "#" works on Mosquitto; hosted brokers like EMQX Cloud Serverless
// reject a root "#" subscription, so set e.g. MQTT_SUBSCRIBE_TOPICS=devices/#
const SUBSCRIBE_TOPICS = (process.env.MQTT_SUBSCRIBE_TOPICS || "#")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

const receivedMessages = [];
let client = null;
let connectedClientsCount = 0;

function startBroker() {
  if (client) {
    return client;
  }

  const options = {
    clientId: `iotsensor-broker-listener-${Math.random().toString(16).slice(2, 10)}`,
  };
  if (USERNAME) options.username = USERNAME;
  if (PASSWORD) options.password = PASSWORD;

  client = mqtt.connect(BROKER_URL, options);

  client.on("connect", () => {
    console.log(`Broker listener connected to broker at ${BROKER_URL}`);

    client.subscribe(SUBSCRIBE_TOPICS, { qos: 0 }, (err) => {
      if (err) {
        console.error(
          `Failed to subscribe to ${SUBSCRIBE_TOPICS.join(", ")}:`,
          err.message
        );
      } else {
        console.log(`Subscribed to: ${SUBSCRIBE_TOPICS.join(", ")}`);
      }
    });

    // Broker stats ($SYS) — best effort; many hosted brokers block this.
    client.subscribe("$SYS/broker/clients/connected", (err) => {
      if (err) {
        console.error("Failed to subscribe to broker stats:", err.message);
      }
    });
  });

  client.on("message", (topic, payload) => {
    if (topic === "$SYS/broker/clients/connected") {
      connectedClientsCount = Number(payload.toString()) || 0;
      return;
    }

    const record = {
      topic,
      message: payload.toString(),
      timestamp: new Date().toISOString(),
    };
    receivedMessages.push(record);
    console.log(
      `Broker received message on topic "${record.topic}": ${record.message}`
    );
  });

  client.on("reconnect", () => {
    console.log("Broker listener reconnecting...");
  });

  client.on("close", () => {
    console.log("Broker listener disconnected from broker");
  });

  client.on("error", (err) => {
    console.error("Broker listener connection error:", err.message);
  });

  return client;
}

function getMessages(topic) {
  if (!topic) {
    return receivedMessages;
  }
  return receivedMessages.filter((msg) => msg.topic === topic);
}

function getStatus() {
  return {
    running: Boolean(client && client.connected),
    brokerUrl: BROKER_URL,
    connectedClients: connectedClientsCount,
    totalMessagesReceived: receivedMessages.length,
  };
}

module.exports = {
  startBroker,
  getMessages,
  getStatus,
};
