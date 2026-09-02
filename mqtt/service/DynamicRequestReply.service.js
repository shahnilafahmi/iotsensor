const mqtt = require("mqtt");

const BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const USERNAME = process.env.MQTT_USERNAME;
const PASSWORD = process.env.MQTT_PASSWORD;
const DEFAULT_TIMEOUT_MS = Number(process.env.MQTT_REQUEST_TIMEOUT_MS || 5000);

let client = null;

// responseTopic -> resolver for the request currently waiting on that topic.
const waiters = new Map();

function getClient() {
  if (client) return client;

  const options = {
    clientId: `iotsensor-dyn-reqrep-${Math.random().toString(16).slice(2, 10)}`,
  };
  if (USERNAME) options.username = USERNAME;
  if (PASSWORD) options.password = PASSWORD;

  client = mqtt.connect(BROKER_URL, options);

  client.on("message", (topic, payload, packet) => {
    if (packet.retain) return; // ignore stale retained value
    const resolve = waiters.get(topic);
    if (resolve) resolve(payload.toString());
  });

  client.on("error", (err) => {
    console.error("Dynamic request/reply connection error:", err.message);
  });

  return client;
}

function whenConnected(c) {
  return new Promise((resolve) => {
    if (c.connected) return resolve();
    const started = Date.now();
    const iv = setInterval(() => {
      if (c.connected || Date.now() - started > 4000) {
        clearInterval(iv);
        resolve();
      }
    }, 50);
  });
}

async function doRequest(command, commandTopic, responseTopic, timeoutMs) {
  const c = getClient();
  await whenConnected(c);

  await new Promise((resolve, reject) => {
    c.subscribe(responseTopic, { qos: 1 }, (err) =>
      err ? reject(err) : resolve()
    );
  });

  return new Promise((resolve, reject) => {
    let done = false;

    const finish = (fn) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      waiters.delete(responseTopic);
      c.unsubscribe(responseTopic, () => {});
      fn();
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          Object.assign(
            new Error(`No reply on "${responseTopic}" within ${timeoutMs}ms`),
            { code: "TIMEOUT" }
          )
        )
      );
    }, timeoutMs);

    waiters.set(responseTopic, (text) =>
      finish(() =>
        resolve({
          command,
          commandTopic,
          responseTopic,
          response: text.trim(),
        })
      )
    );

    c.publish(commandTopic, command, { qos: 1, retain: false }, (err) => {
      if (err) finish(() => reject(err));
    });
  });
}

// The device gives plain string answers with no correlation id, so requests are
// serialised: only one round-trip happens at a time regardless of topic.
let chain = Promise.resolve();

// Publishes `command` to `commandTopic` and resolves with the next reply seen on
// the caller-supplied `responseTopic`, or rejects with code "TIMEOUT".
function request(
  command,
  { commandTopic, responseTopic, timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) {
  const run = () => doRequest(command, commandTopic, responseTopic, timeoutMs);
  const result = chain.then(run, run);
  chain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

module.exports = {
  request,
};
