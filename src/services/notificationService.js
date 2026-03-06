const { admin, db } = require("../config/firebase");
const { Realtime, Firestore } = require("../utils/db");

/**
 * Resolves FCM tokens from user IDs.
 * @param {string[]} userIds - Array of user IDs.
 * @returns {Promise<string[]>} - Array of FCM tokens.
 */
async function getTokensFromUserIds(userIds) {
  if (!userIds || userIds.length === 0) return [];

  const users = await Firestore.getByIds("users", userIds);
  return users.map((user) => user.fcmToken).filter((token) => !!token);
}

/**
 * Resolves FCM tokens for all users.
 * @returns {Promise<string[]>} - Array of FCM tokens.
 */
async function getAllUserTokens() {
  const users = await Firestore.getAll("users");
  return users.map((user) => user.fcmToken).filter((token) => !!token);
}

/**
 * Sends a push notification or in-app event via FCM and logs it to the Realtime Database.
 *
 * @param {Object} payload - The FCM message payload.
 * @returns {Promise<Object>} - The FCM response summary.
 */
async function sendPushNotification(payload) {
  try {
    const { token, tokens, userIds, sendToAll, ...messageData } = payload;
    let targetTokens = [];

    // 1. Resolve target tokens
    if (sendToAll) {
      targetTokens = await getAllUserTokens();
    } else {
      if (token) targetTokens.push(token);
      if (tokens && Array.isArray(tokens))
        targetTokens = [...targetTokens, ...tokens];
      if (userIds && Array.isArray(userIds)) {
        const resolvedTokens = await getTokensFromUserIds(userIds);
        targetTokens = [...targetTokens, ...resolvedTokens];
      }
    }

    // De-duplicate and filter
    targetTokens = [...new Set(targetTokens)].filter((t) => !!t);

    if (targetTokens.length === 0) {
      throw new Error("No valid recipient tokens found.");
    }

    let response;
    if (targetTokens.length === 1) {
      // Single send
      const singleMessage = { ...messageData, token: targetTokens[0] };
      const messageId = await admin.messaging().send(singleMessage);
      response = {
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true, messageId }],
      };
    } else {
      // Multicast send
      const multicastMessage = { ...messageData, tokens: targetTokens };
      response = await admin.messaging().sendEachForMulticast(multicastMessage);
    }

    console.log("FCM Response:", JSON.stringify(response));

    // Determine the storage path in Realtime Database
    const logPath = payload.notification
      ? "push-notifications"
      : "in-app-events";

    // Log the event/notification
    const logData = {
      ...payload,
      resolvedTokens: targetTokens,
      sentAt: new Date().toISOString(),
      fcmResponse: response,
      status: "sent",
    };

    await Realtime.push(logPath, logData);

    return response;
  } catch (error) {
    console.error("Error sending message:", error);

    const logPath = payload.notification
      ? "failed-push-notifications"
      : "failed-in-app-events";
    try {
      await Realtime.push(logPath, {
        ...payload,
        error: error.message,
        failedAt: new Date().toISOString(),
        status: "failed",
      });
    } catch (logError) {
      console.error(
        "Failed to log notification error to Realtime DB:",
        logError,
      );
    }

    throw error;
  }
}

module.exports = {
  sendPushNotification,
};
