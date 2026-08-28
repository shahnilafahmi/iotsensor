const mqtt = require("mqtt");

// Real Mosquitto broker address (not embedded anymore).
// e.g. mqtt://mosquitto.railway.internal:1883 (private network) or
//      mqtt://<tcp-proxy-host>:<tcp-proxy-port> (public)
const BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";

const receivedMessages = [];
let client = null;
let connectedClientsCount = 0;

function startBroker() {
  if (client) {
    return client;
  }

  client = mqtt.connect(BROKER_URL, {
    clientId: `iotsensor-broker-listener-${Math.random().toString(16).slice(2, 10)}`,
  });

  client.on("connect", () => {
    console.log(`Broker listener connected to Mosquitto at ${BROKER_URL}`);

    // "#" catches every normal topic. Mosquitto excludes "$SYS/..." topics
    // from "#" by convention, so subscribe to the stats we want separately.
    client.subscribe("#", { qos: 0 }, (err) => {
      if (err) {
        console.error("Failed to subscribe to '#':", err.message);
      } else {
        console.log("Subscribed to all topics (#)");
      }
    });

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
    console.log("Broker listener reconnecting to Mosquitto...");
  });

  client.on("close", () => {
    console.log("Broker listener disconnected from Mosquitto");
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
