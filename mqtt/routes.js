const express = require("express");
const brokerController = require("./controller/Broker.controller");
const publisherController = require("./controller/Publisher.controller");

const router = express.Router();

router.get("/broker/status", brokerController.getStatus);
router.get("/broker/messages", brokerController.getMessages);
router.post("/broker/messages", brokerController.getMessages);

router.post("/publisher/publish", publisherController.publish);

// Raw-text body variant: send the command as plain text (Postman: Body -> raw -> Text).
// Topic via query string, e.g. /publisher/publish-text?topic=sensors/data
router.post(
  "/publisher/publish-text",
  express.text({ type: () => true }),
  publisherController.publishText
);

module.exports = router;
