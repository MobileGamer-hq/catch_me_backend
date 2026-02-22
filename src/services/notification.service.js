const { db, admin } = require("../config/firebase");
const { Firestore } = require("../utils/db");
const { LinkUtils } = require("./linkUtilities");

// Send notification to all followers
const notifyFollowers = async (type = "post", userId, id) => {
  // Get the user who triggered the notification
  const user = await Firestore.getById("users", userId);
  if (!user) throw new Error("User not found!");

  const followers = user.followers || [];

  // Loop followers
  for (const followerId of followers) {
    const notif = {
      id: `${userId}-${Date.now()}-notification-${type}`,
      recipientId: followerId,
      senderId: userId,
      title: `${user.username} made a new ${type}!`,
      body: { type, fromUser: userId },
      sentAt: Date.now(),
      link:
        type === "game"
          ? LinkUtils.generateGameLink(id)
          : LinkUtils.generatePostLink(id),
    };

    // Add notification using arrayUnion
    try {
      await db
        .collection("users")
        .doc(followerId)
        .update({
          notifications: admin.firestore.FieldValue.arrayUnion(notif),
        });
    } catch (err) {
      console.error("Couldn't Add Notificatio! ${err.message}");
    }
    console.log(`Notification ${notif.id} sent to ${followerId}`);
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
  // Add notification using arrayUnion
  try {
    await db
      .collection("users")
      .doc(userId)
      .update({
        notifications: admin.firestore.FieldValue.arrayUnion(data),
      });
  } catch (err) {
    console.error("Couldn't Add Notificatio! ${err.message}");
  }
  console.log(`Notification ${data.id} sent to ${userId}`);
};

module.exports = { notifyFollowers };
