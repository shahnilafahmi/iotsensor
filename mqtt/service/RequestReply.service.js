const mqtt = require("mqtt");

const BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const USERNAME = process.env.MQTT_USERNAME;
const PASSWORD = process.env.MQTT_PASSWORD;

// Topic the device/controller listens on for commands, and the topic it
// publishes its answer to.
const COMMAND_TOPIC = process.env.MQTT_COMMAND_TOPIC || "sensors/data";
const RESPONSE_TOPIC = process.env.MQTT_RESPONSE_TOPIC || "sensors/response";
const DEFAULT_TIMEOUT_MS = Number(process.env.MQTT_REQUEST_TIMEOUT_MS || 5000);

let client = null;
let subscribed = false;

// The device gives plain string answers with no correlation id, so we can only
// safely have ONE request in flight at a time: requests are serialised, and any
// reply that arrives while no request is waiting (e.g. an unsolicited status) is
// ignored.
let activeResolve = null;
let chain = Promise.resolve();

function getClient() {
  if (client) return client;

  const options = {
    clientId: `iotsensor-reqrep-${Math.random().toString(16).slice(2, 10)}`,
  };
  if (USERNAME) options.username = USERNAME;
  if (PASSWORD) options.password = PASSWORD;

  client = mqtt.connect(BROKER_URL, options);

  client.on("connect", () => {
    client.subscribe(RESPONSE_TOPIC, { qos: 1 }, (err) => {
      if (err) {
        console.error("Request/reply subscribe error:", err.message);
      } else {
        subscribed = true;
        console.log(`Request/reply listening on ${RESPONSE_TOPIC}`);
      }
    });
  });

  client.on("message", (topic, payload, packet) => {
    if (topic !== RESPONSE_TOPIC || packet.retain) return; // ignore stale retained value
    if (activeResolve) activeResolve(payload.toString());
  });

  client.on("error", (err) => {
    console.error("Request/reply connection error:", err.message);
  });

  return client;
}

function whenReady(c) {
  return new Promise((resolve) => {
    if (c.connected && subscribed) return resolve();
    const started = Date.now();
    const iv = setInterval(() => {
      if ((c.connected && subscribed) || Date.now() - started > 4000) {
        clearInterval(iv);
        resolve();
      }
    }, 50);
  });
}

async function doRequest(command, commandTopic, timeoutMs) {
  const c = getClient();
  await whenReady(c);

  return new Promise((resolve, reject) => {
    let done = false;

    const finish = (fn) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      activeResolve = null;
      fn();
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          Object.assign(
            new Error(`No reply on "${RESPONSE_TOPIC}" within ${timeoutMs}ms`),
            { code: "TIMEOUT" }
          )
        )
      );
    }, timeoutMs);

    activeResolve = (text) =>
      finish(() =>
        resolve({
          command,
          commandTopic,
          responseTopic: RESPONSE_TOPIC,
          response: text.trim(),
        })
      );

    c.publish(commandTopic, command, { qos: 1, retain: false }, (err) => {
      if (err) finish(() => reject(err));
    });
  });
}

// Publishes `command` to the command topic and resolves with the next reply
// seen on the response topic, or rejects with code "TIMEOUT". Calls are queued
// so only one round-trip happens at a time.
function request(
  command,
  { commandTopic = COMMAND_TOPIC, timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) {
  const run = () => doRequest(command, commandTopic, timeoutMs);
  const result = chain.then(run, run);
  chain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

module.exports = {
  request,
  COMMAND_TOPIC,
  RESPONSE_TOPIC,
};
