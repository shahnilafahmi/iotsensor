const brokerService = require("../service/Broker.service");

function getStatus(req, res) {
  res.status(200).json(brokerService.getStatus());
}

function getMessages(req, res) {
  const topic = (req.body && req.body.topic) || req.query.topic;
  const messages = brokerService.getMessages(topic);
  res.status(200).json(messages);
}

module.exports = {
  getStatus,
  getMessages,
};
