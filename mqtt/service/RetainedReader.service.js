const mqtt = require("mqtt");

const BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const USERNAME = process.env.MQTT_USERNAME;
const PASSWORD = process.env.MQTT_PASSWORD;

// How long to wait for the broker to hand over the retained message after we
// subscribe. If nothing arrives, the topic has no retained value.
const READ_WAIT_MS = Number(process.env.MQTT_READ_WAIT_MS || 2000);

let client = null;

// topic -> resolver for the read currently waiting on it.
const waiters = new Map();

function getClient() {
  if (client) return client;

  const options = {
    clientId: `iotsensor-retained-${Math.random().toString(16).slice(2, 10)}`,
    reconnectPeriod: 2000,
  };
  if (USERNAME) options.username = USERNAME;
  if (PASSWORD) options.password = PASSWORD;

  client = mqtt.connect(BROKER_URL, options);

  client.on("message", (topic, payload, packet) => {
    const waiter = waiters.get(topic);
    if (waiter) waiter(payload.toString(), packet.retain);
  });

  client.on("error", (err) => {
    console.error("Retained reader connection error:", err.message);
  });

  return client;
}

function doRead(topic, waitMs) {
  return new Promise((resolve, reject) => {
    const c = getClient();
    let settled = false;

    const done = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      waiters.delete(topic);
      try {
        c.unsubscribe(topic, () => {});
      } catch (_) {
        /* ignore */
      }
      fn();
    };

    // No retained message (and nothing published while we waited) -> null.
    const timer = setTimeout(() => done(() => resolve(null)), waitMs);

    // First message on a fresh subscription is the broker's retained value.
    waiters.set(topic, (value, retained) =>
      done(() => resolve({ topic, value: value.trim(), retained: Boolean(retained) }))
    );

    c.subscribe(topic, { qos: 0 }, (err) => {
      if (err) done(() => reject(err));
    });
  });
}

// Reads are serialised to keep one subscription in flight at a time.
let chain = Promise.resolve();

// Resolves with { topic, value, retained } for the latest message the broker
// holds on `topic`, or null if there is none.
function readLatest(topic, waitMs = READ_WAIT_MS) {
  const run = () => doRead(topic, waitMs);
  const result = chain.then(run, run);
  chain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

module.exports = {
  readLatest,
};
