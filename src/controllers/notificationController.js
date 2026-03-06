const notificationService = require("../services/notificationService");

/**
 * Controller to handle sending notifications via API.
 */
async function sendNotification(req, res) {
  try {
    const payload = req.body;

    // Validation: At least one recipient method must be provided
    const { token, tokens, userIds, sendToAll } = payload;
    if (
      !token &&
      (!tokens || tokens.length === 0) &&
      (!userIds || userIds.length === 0) &&
      !sendToAll
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one recipient (token, tokens, userIds, or sendToAll) is required.",
      });
    }

    const messageId = await notificationService.sendPushNotification(payload);

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully.",
      messageId: messageId,
    });
  } catch (error) {
    console.error("Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send notification.",
      error: error.message,
    });
  }
}

/**
 * Controller to handle sending notifications to all users.
 */
async function sendNotificationToAll(req, res) {
  try {
    const payload = req.body || {};
    payload.sendToAll = true;

    const messageId = await notificationService.sendPushNotification(payload);

    return res.status(200).json({
      success: true,
      message: "Notification sent to all users successfully.",
      messageId: messageId,
    });
  } catch (error) {
    console.error("Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send notification to all users.",
      error: error.message,
    });
  }
}

module.exports = {
  sendNotification,
  sendNotificationToAll,
};
