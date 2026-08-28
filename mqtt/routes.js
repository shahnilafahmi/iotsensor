const express = require("express");
const brokerController = require("./controller/Broker.controller");
const publisherController = require("./controller/Publisher.controller");

const router = express.Router();

router.get("/broker/status", brokerController.getStatus);
router.get("/broker/messages", brokerController.getMessages);
router.post("/broker/messages", brokerController.getMessages);

router.post("/publisher/publish", publisherController.publish);

module.exports = router;
