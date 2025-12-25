const { db, admin } = require("../services/firebaseAdmin");
const {Firestore} = require("./database");
const {LinkUtils} = require("../services/linkUtilities");

// Send notification to all followers
const notifyFollowers = async (type = 'post', userId, id) => {
    // Get the user who triggered the notification
    const user = await Firestore.getById('users', userId);
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
            link: type === 'game' ? LinkUtils.generateGameLink(id) : LinkUtils.generatePostLink(id),
        };

        // Add notification using arrayUnion
        try{
            await db
                .collection("users")
                .doc(followerId)
                .update({
                    notifications: admin.firestore.FieldValue.arrayUnion(notif)
                });

        }catch(err){
            console.error("Couldn't Add Notificatio! ${err.message}");
        }
        console.log(`Notification ${notif.id} sent to ${followerId}`);
    }
};

module.exports = { notifyFollowers };
