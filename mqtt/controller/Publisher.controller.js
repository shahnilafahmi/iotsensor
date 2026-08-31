const publisherService = require("../service/Publisher.service");

const DEFAULT_TOPIC = process.env.MQTT_DEFAULT_TOPIC || "sensors/data";
const RESPONSE_TOPIC = "sensors/response";

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
  let command = "";
  if (typeof req.body === "string") {
    command = req.body.trim();
  } else if (Buffer.isBuffer(req.body)) {
    command = req.body.toString("utf8").trim();
  } else if (req.body && typeof req.body.command === "string") {
    command = req.body.command.trim();
  }

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

module.exports = {
  publish,
  publishText,
  publishResponse,
};
