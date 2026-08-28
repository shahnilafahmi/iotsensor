const publisherService = require("../service/Publisher.service");

// async function publish(req, res) {
//   const { topic, sensorId, type, value, unit } = req.body;

//   if (!topic || !sensorId || !type || value === undefined) {
//     return res.status(400).json({
//       message: "topic, sensorId, type and value are required",
//     });
//   }

//   try {
//     const result = await publisherService.publishMessage(topic, {
//       sensorId,
//       type,
//       value,
//       unit,
//       timestamp: new Date().toISOString(),
//     });
//     res.status(200).json({ message: "Message published successfully", ...result });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to publish message", error: err.message });
//   }
// }


async function publish(req, res) {
  const { topic, command } = req.body;

  if (!topic || !command ) {
    return res.status(400).json({
      message: "topic, command, type and value are required",
    });
  }

  try {
    const result = await publisherService.publishMessage(topic, {
      command,
     
    });
    res.status(200).json({ message: "Message published successfully", ...result });
  } catch (err) {
    res.status(500).json({ message: "Failed to publish message", error: err.message });
  }
}

module.exports = {
  publish,
};
