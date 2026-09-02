const publisherService = require("../service/Publisher.service");
const requestReply = require("../service/RequestReply.service");
const dynamicRequestReply = require("../service/DynamicRequestReply.service");

const DEFAULT_TOPIC = process.env.MQTT_DEFAULT_TOPIC || "sensors/data";
const RESPONSE_TOPIC = "sensors/response";

// Pull a plain string out of a raw-text (or JSON {command}) request body.
function readTextBody(req) {
  if (typeof req.body === "string") return req.body.trim();
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8").trim();
  if (req.body && typeof req.body.command === "string") return req.body.command.trim();
  return "";
}

async function publish(req, res) {
  const { topic, command, retain, qos } = req.body;

  if (!topic || !command) {
    return res.status(400).json({
      message: "topic and command are required",
    });
  }

  const options = {};
  if (retain !== undefined) options.retain = Boolean(retain);
  if (qos !== undefined) options.qos = Number(qos);

  try {
    const result = await publisherService.publishMessage(
      topic,
      { command },
      options
    );
    res
      .status(200)
      .json({ message: "Message published successfully", ...result });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to publish message", error: err.message });
  }
}

// Reads the raw request body as a command string and publishes it to `topic`
// as a plain string (not JSON). retain/qos can be overridden via query string.
async function publishTextToTopic(req, res, topic) {
  const command = readTextBody(req);

  if (!command) {
    return res.status(400).json({
      message: "request body must be a non-empty command string",
    });
  }

  const options = {};
  if (req.query.retain !== undefined) {
    options.retain = req.query.retain !== "false";
  }
  if (req.query.qos !== undefined) {
    options.qos = Number(req.query.qos);
  }

  try {
    const result = await publisherService.publishMessage(topic, command, options);
    res
      .status(200)
      .json({ message: "Message published successfully", ...result });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to publish message", error: err.message });
  }
}

// Same as publish(), but the request body is the raw command string (text).
// Topic comes from ?topic=... (defaults to MQTT_DEFAULT_TOPIC / "sensors/data").
function publishText(req, res) {
  return publishTextToTopic(req, res, req.query.topic || DEFAULT_TOPIC);
}

// Same as publishText(), but always publishes to the "sensors/response" topic.
function publishResponse(req, res) {
  return publishTextToTopic(req, res, RESPONSE_TOPIC);
}

// Request/reply: publish the raw text body as a command, then wait for the
// device's answer on the response topic and return it in the HTTP response.
//   ?topic=    command topic   (default MQTT_COMMAND_TOPIC / "sensors/data")
//   ?timeout=  ms to wait      (default MQTT_REQUEST_TIMEOUT_MS / 5000)
async function command(req, res) {
  const cmd = readTextBody(req);

  if (!cmd) {
    return res.status(400).json({
      message: "request body must be a non-empty command string",
    });
  }

  const options = {};
  if (req.query.topic) options.commandTopic = req.query.topic;
  if (req.query.timeout !== undefined) options.timeoutMs = Number(req.query.timeout);

  // Publishing the command onto the response topic would just echo back to us.
  if (options.commandTopic === requestReply.RESPONSE_TOPIC) {
    return res.status(400).json({
      message: `command topic must differ from the response topic ("${requestReply.RESPONSE_TOPIC}") — drop the ?topic= override to use the default "${requestReply.COMMAND_TOPIC}"`,
    });
  }

  try {
    const result = await requestReply.request(cmd, options);
    res.status(200).json({ message: "ok", ...result });
  } catch (err) {
    if (err.code === "TIMEOUT") {
      return res.status(504).json({
        message: "Device did not respond in time",
        error: err.message,
      });
    }
    res.status(500).json({ message: "Request failed", error: err.message });
  }
}

// Same as command(), but the reply topic is supplied by the caller so the
// frontend can target a specific device, e.g.
//   /publisher/command-dynamic?topic=device1/response
//   ?topic=     topic to listen on for the device's reply (REQUIRED)
//   ?timeout=   ms to wait (default MQTT_REQUEST_TIMEOUT_MS / 5000)
// The command itself is published to the configured command topic
// (MQTT_COMMAND_TOPIC / "sensors/data"), same as /publisher/command.
async function commandDynamic(req, res) {
  const cmd = readTextBody(req);

  if (!cmd) {
    return res.status(400).json({
      message: "request body must be a non-empty command string",
    });
  }

  const responseTopic = req.query.topic;

  if (!responseTopic) {
    return res.status(400).json({
      message: "topic query parameter is required (the device reply topic)",
    });
  }

  // Publishing the command onto the topic we're listening on would just echo
  // straight back to us.
  if (responseTopic === requestReply.COMMAND_TOPIC) {
    return res.status(400).json({
      message: `topic must differ from the command topic ("${requestReply.COMMAND_TOPIC}")`,
    });
  }

  const options = { commandTopic: requestReply.COMMAND_TOPIC, responseTopic };
  if (req.query.timeout !== undefined) options.timeoutMs = Number(req.query.timeout);

  try {
    const result = await dynamicRequestReply.request(cmd, options);
    res.status(200).json({ message: "ok", ...result });
  } catch (err) {
    if (err.code === "TIMEOUT") {
      return res.status(504).json({
        message: "Device did not respond in time",
        error: err.message,
      });
    }
    res.status(500).json({ message: "Request failed", error: err.message });
  }
}

module.exports = {
  publish,
  publishText,
  publishResponse,
  command,
  commandDynamic,
};
