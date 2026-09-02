const mqtt = require("mqtt");

const BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const USERNAME = process.env.MQTT_USERNAME;
const PASSWORD = process.env.MQTT_PASSWORD;
const DEFAULT_TIMEOUT_MS = Number(process.env.MQTT_REQUEST_TIMEOUT_MS || 5000);

// After subscribing, wait briefly before publishing the command so the broker's
// retained message / backlog for the topic arrives first and gets discarded.
const RETAINED_DRAIN_MS = 200;

// If the SUBACK never comes, publish anyway after this so a request can never
// stall longer than its own timeout.
const SUBSCRIBE_GRACE_MS = 1500;

let client = null;

// exact responseTopic -> resolver for the request currently waiting on it.
const waiters = new Map();

function getClient() {
  if (client) return client;

  const options = {
    clientId: `iotsensor-dyn-reqrep-${Math.random().toString(16).slice(2, 10)}`,
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
    console.error("Dynamic request/reply connection error:", err.message);
  });

  return client;
}

function once(fn) {
  let called = false;
  return (...args) => {
    if (called) return;
    called = true;
    fn(...args);
  };
}

// One round-trip. Every exit path goes through finish(), which clears the timer,
// drops the waiter and unsubscribes — nothing here can hang past timeoutMs.
function doRequest(command, commandTopic, responseTopic, timeoutMs) {
  return new Promise((resolve, reject) => {
    const c = getClient();

    let drain = null;

    const finish = once((err, value) => {
      clearTimeout(timer);
      clearTimeout(grace);
      clearTimeout(drain);
      waiters.delete(responseTopic);
      try {
        c.unsubscribe(responseTopic, () => {});
      } catch (_) {
        /* ignore */
      }
      if (err) reject(err);
      else resolve(value);
    });

    const timer = setTimeout(() => {
      finish(
        Object.assign(
          new Error(`No reply on "${responseTopic}" within ${timeoutMs}ms`),
          { code: "TIMEOUT" }
        )
      );
    }, timeoutMs);

    // Only a message that lands *after* we send the command counts as the reply.
    // Anything already on the topic — a retained value, or telemetry the device
    // streams independently — is ignored so it can't masquerade as an answer.
    let commandSent = false;

    waiters.set(responseTopic, (text, retained) => {
      if (retained || !commandSent) return;
      finish(null, {
        command,
        commandTopic,
        responseTopic,
        response: text.trim(),
      });
    });

    const publish = once(() => {
      commandSent = true;
      c.publish(commandTopic, command, { qos: 1, retain: false }, (err) => {
        if (err) finish(err);
      });
    });

    // Publish shortly after the SUBACK (letting retained/backlog drain first),
    // or after a hard grace if the SUBACK never arrives.
    const grace = setTimeout(publish, SUBSCRIBE_GRACE_MS);
    c.subscribe(responseTopic, { qos: 1 }, (err) => {
      if (err) return finish(err);
      drain = setTimeout(publish, RETAINED_DRAIN_MS);
    });
  });
}

// The device gives plain string answers with no correlation id, so requests are
// serialised: one round-trip at a time regardless of topic. A rejection in one
// request does not block the next (the chain swallows both outcomes).
let chain = Promise.resolve();

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
