const { db, admin } = require("../config/firebase");
const { Firestore, Realtime } = require("../utils/db");
const { LinkUtils } = require("./linkUtilities");
const { sendPushNotification } = require("./notificationService");

// Send notification to all followers
const notifyFollowers = async (type = "post", userId, id) => {
  if (!userId || !id) {
    console.error(
      `Missing required parameters for notifyFollowers: type=${type}, userId=${userId}, id=${id}`,
    );
    return;
  }

  // Get the user who triggered the notification
  const user = await Firestore.getById("users", userId);
  if (!user) {
    console.warn(`User ${userId} not found for follower notification!`);
    return;
  }

  const followers = user.followers || [];

  const title = `${user.username} made a new ${type}!`;
  const link =
    type === "game"
      ? LinkUtils.generateGameLink(id)
      : LinkUtils.generatePostLink(id);

  // Loop followers
  for (const followerId of followers) {
    const notif = {
      id: `${userId}-${Date.now()}-notification-${type}`,
      recipientId: followerId,
      senderId: userId,
      title: title,
      body: { type, fromUser: userId },
      sentAt: Date.now(),
      link: link,
    };

    // 1. Add notification to Firestore array (Legacy support/Backup)
    try {
      await db
        .collection("users")
        .doc(followerId)
        .update({
          notifications: admin.firestore.FieldValue.arrayUnion(notif),
        });

      // 2. Push to Realtime Database for live updates
      await Realtime.push(`notifications/${followerId}`, {
        ...notif,
        status: "unread",
        createdAt: new Date().toISOString(),
      });

      console.log(`Notification & Realtime Message sent to ${followerId}`);
    } catch (err) {
      console.error(
        `Couldn't Add Notification/Realtime Message! ${err.message}`,
      );
    }
  }

  // 3. Send push notification to all followers
  if (followers.length > 0) {
    try {
      await sendPushNotification({
        userIds: followers,
        notification: {
          title: title,
          body: `Tap to view ${user.username}'s new ${type}.`,
        },
        data: {
          type,
          id,
          link,
        },
      });
      console.log(`Push notification sent to ${followers.length} followers.`);
    } catch (err) {
      console.error(`Couldn't send Push Notifications! ${err.message}`);
    }
  }
};

const generateNotification = (type = "post", userId, id, title) => {
  const notif = {
    id: `${userId}-${Date.now()}-notification-${type}`,
    recipientId: userId,
    senderId: "",
    title: title,
    body: { type, fromUser: userId },
    sentAt: Date.now(),
    link:
      type === "game"
        ? LinkUtils.generateGameLink(id)
        : LinkUtils.generatePostLink(id),
  };

  return notif;
};

const sendNotification = async (userId, data) => {
  try {
    // 1. Add to Firestore array
    await db
      .collection("users")
      .doc(userId)
      .update({
        notifications: admin.firestore.FieldValue.arrayUnion(data),
      });

    // 2. Push to Realtime Database
    await Realtime.push(`notifications/${userId}`, {
      ...data,
      recipientId: userId,
      status: "unread",
      createdAt: new Date().toISOString(),
    });

    console.log(`Notification & Realtime Message sent to ${userId}`);

    // 3. Send push notification
    if (data.title) {
      await sendPushNotification({
        userIds: [userId],
        notification: {
          title: data.title,
          body: "You have a new notification.",
        },
        data: {
          link: data.link || "",
        },
      });
    }
  } catch (err) {
    console.error(`Couldn't Add Notification/Realtime Message! ${err.message}`);
  }
};

module.exports = { notifyFollowers, generateNotification, sendNotification };
