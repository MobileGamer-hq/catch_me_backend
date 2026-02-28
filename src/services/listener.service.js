const { db } = require("../config/firebase");
const { notifyFollowers } = require("./notification.service");
const gameFinalizationService = require("./gameFinalization.service");

/* ────────────────────────────────────────────────
   Watch NEW POSTS
────────────────────────────────────────────────── */
function watchPosts() {
  let isInitialLoad = true;

  db.collection("posts").onSnapshot(async (snapshot) => {
    if (isInitialLoad) {
      isInitialLoad = false;
      console.log("Initializing posts");
      return;
    }

    for (const change of snapshot.docChanges()) {
      if (change.type === "added") {
        const post = change.doc.data();
        console.log("New Post:", post.id);

        // 1. Send Notifications
        await notifyFollowers(
          "post",
          post.userId,
          post.id, // use Firestore doc ID
        );

        // 2. Hybrid Fan-out (Push to Feed)
        // Only push for authors with < 1000 followers to save writes
        try {
          const authorDoc = await db.collection("users").doc(post.userId).get();
          const author = authorDoc.data();

          // Default to 0 if field missing
          const followerCount = author?.followers?.length || 0;

          if (followerCount < 1000 && author?.followers) {
            const batch = db.batch();
            let opCount = 0;

            for (const followerId of author.followers) {
              const feedRef = db
                .collection("users")
                .doc(followerId)
                .collection("feedItems")
                .doc(post.id);
              batch.set(feedRef, {
                postId: post.id,
                authorId: post.userId,
                createdAt: post.createdAt, // Ensure this exists or use FieldValue
                type: "post",
              });
              opCount++;

              if (opCount >= 450) {
                await batch.commit();
                opCount = 0;
                // batch = db.batch(); // Re-instantiate if we were doing > 500, but simple logic for now
              }
            }

            if (opCount > 0) await batch.commit();
            console.log(
              `Pushed post ${post.id} to ${author.followers.length} feeds.`,
            );
          }
        } catch (err) {
          console.error("Fan-out failed:", err);
        }
      }
    }
  });
}

/* ────────────────────────────────────────────────
   Watch NEW GAMES
────────────────────────────────────────────────── */
function watchGames() {
  let isInitialLoad = true;

  db.collection("games")
    .where("type", "==", "game")
    .onSnapshot(async (snapshot) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        console.log("Initializing games");
        return;
      }

      for (const change of snapshot.docChanges()) {
        if (change.type === "added") {
          const game = change.doc.data();
          console.log("New Game:", game.id);

          await notifyFollowers(
            "game",
            game.userId || game.createdBy, // adjust to your field name
            game.id,
          );
        }

        if (change.type === "modified") {
          const game = change.doc.data();
          const status = game.currentState?.status;

          // If the game just finished, run the finalization engine
          if (status === "completed" || status === "finished") {
            // Only finalize if it hasn't been finalized yet (check if summary or stats exist)
            if (!game.summary) {
              console.log(
                `[Listener] Game ${change.doc.id} completed. Triggering finalization...`,
              );
              await gameFinalizationService.finalizeGame(change.doc.id);
            }
          }
        }
      }
    });
}

/* ────────────────────────────────────────────────
   Watch NEW EVENTS
────────────────────────────────────────────────── */
function watchEvents() {
  let isInitialLoad = true;

  db.collection("events").onSnapshot(async (snapshot) => {
    if (isInitialLoad) {
      isInitialLoad = false;
      console.log("Initializing events");
      return;
    }

    for (const change of snapshot.docChanges()) {
      if (change.type === "added") {
        const event = change.doc.data();
        console.log("New Event:", change.doc.id);

        await notifyFollowers("events", event.userId || event.userId, event.id);
      }
    }
  });
}

module.exports = {
  watchPosts,
  watchGames,
  watchEvents,
};
