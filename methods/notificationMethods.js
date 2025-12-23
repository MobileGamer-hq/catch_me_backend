const { db, admin } = require("../services/firebaseAdmin");
const { LinkUtils } = require("../services/linkUtilities");

// Send notification to all followers
const notifyFollowers = async (type = "post", userId, targetId) => {
    // Fetch triggering user
    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) throw new Error("User not found!");

    const user = { id: userId, ...userSnap.data() };
    const followers = user.followers || [];

    if (!followers.length) return;

    const batch = db.batch();

    for (const followerId of followers) {
        const notifId = `${userId}-${targetId}-${Date.now()}`;

        const notif = {
            id: notifId,
            recipientId: followerId,
            senderId: userId,
            title: `${user.username} made a new ${type}!`,
            body: {
                type,
                fromUser: userId,
            },
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            link:
                type === "game"
                    ? LinkUtils.generateGameLink(targetId)
                    : LinkUtils.generatePostLink(targetId),
            read: false,
        };

        const userRef = db.collection("users").doc(followerId);

        batch.update(userRef, {
            notifications: admin.firestore.FieldValue.arrayUnion(notif),
        });
    }

    await batch.commit();
    console.log(`Notifications sent to ${followers.length} followers`);
};

module.exports = { notifyFollowers };
