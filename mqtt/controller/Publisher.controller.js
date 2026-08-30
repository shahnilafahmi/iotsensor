const publisherService = require("../service/Publisher.service");

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

module.exports = {
  publish,
};
