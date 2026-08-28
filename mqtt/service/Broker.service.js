const aedes = require("aedes")();
const net = require("net");

const PORT = process.env.MQTT_PORT || 1883;

const receivedMessages = [];
let server = null;

function startBroker() {
  if (server) {
    return server;
  }

  server = net.createServer(aedes.handle);

  aedes.on("client", (client) => {
    console.log(`MQTT client connected: ${client.id}`);
  });

  aedes.on("clientDisconnect", (client) => {
    console.log(`MQTT client disconnected: ${client.id}`);
  });

  aedes.on("publish", (packet, client) => {
    if (client) {
      const record = {
        topic: packet.topic,
        message: packet.payload.toString(),
        clientId: client.id,
        timestamp: new Date().toISOString(),
      };
      receivedMessages.push(record);
      console.log(
        `Broker received message on topic "${record.topic}" from ${client.id}: ${record.message}`
      );
    }
  });

  server.listen(PORT, () => {
    console.log(`MQTT broker listening on port ${PORT}`);
  });

  return server;
}

function getMessages(topic) {
  if (!topic) {
    return receivedMessages;
  }
  return receivedMessages.filter((msg) => msg.topic === topic);
}

function getStatus() {
  return {
    running: Boolean(server),
    port: PORT,
    connectedClients: Object.keys(aedes.clients || {}).length,
    totalMessagesReceived: receivedMessages.length,
  };
}

module.exports = {
  startBroker,
  getMessages,
  getStatus,
};
