const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

// Notification routes
router.post("/send", notificationController.sendNotification);
router.post("/send-all", notificationController.sendNotificationToAll);

module.exports = router;
