const { db } = require("../config/firebase");
const { notifyFollowers } = require("./notification.service");
const gameFinalizationService = require("./gameFinalization.service");

/**
 * Distributed lock to prevent multiple instances from running the same logic twice.
 */
async function runWithLock(lockId, callback) {
  const lockRef = db.collection("system_locks").doc(lockId);
  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(lockRef);
      if (doc.exists) {
        throw new Error("ALREADY_LOCKED");
      }
      t.set(lockRef, { lockedAt: new Date().toISOString() });
    });
    // We obtained the lock
    await callback();
  } catch (err) {
    if (err.message !== "ALREADY_LOCKED") {
      console.error(`[Lock] Error running with lock ${lockId}:`, err);
    } else {
      console.log(`[Lock] Skipping ${lockId}, already processed.`);
    }
  }
}

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
        const postId = change.doc.id;
        const userId = post.userId || post.authorId || post.createdBy;

        console.log("New Post detected:", postId, "by user:", userId);

        if (!userId) {
          console.warn(
            `Post ${postId} has no valid userId. Skipping notification.`,
          );
          continue;
        }

        await runWithLock(`post_${postId}`, async () => {
          // 1. Send Notifications
          await notifyFollowers("post", userId, postId);

          // 2. Hybrid Fan-out (Push to Feed)
          // Only push for authors with < 1000 followers to save writes
          try {
            const authorDoc = await db.collection("users").doc(userId).get();
            const author = authorDoc.data();

            if (!author) {
              console.warn(`Author ${userId} not found for post ${postId}`);
              return;
            }

            // Default to 0 if field missing
            const followerCount = author.followers?.length || 0;

            if (followerCount < 1000 && author.followers) {
              const batch = db.batch();
              let opCount = 0;

              for (const followerId of author.followers) {
                const feedRef = db
                  .collection("users")
                  .doc(followerId)
                  .collection("feedItems")
                  .doc(postId);
                batch.set(feedRef, {
                  postId: postId,
                  authorId: userId,
                  createdAt: post.createdAt || new Date().toISOString(),
                  type: "post",
                });
                opCount++;

                if (opCount >= 450) {
                  await batch.commit();
                  opCount = 0;
                }
              }

              if (opCount > 0) await batch.commit();
              console.log(
                `Pushed post ${postId} to ${author.followers.length} feeds.`,
              );
            }
          } catch (err) {
            console.error("Fan-out failed:", err);
          }
        });
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
          const gameId = change.doc.id;
          const userId = game.userId || game.createdBy || game.authorId;

          console.log("New Game detected:", gameId, "by user:", userId);

          if (!userId) {
            console.warn(
              `Game ${gameId} has no valid userId. Skipping notification.`,
            );
            continue;
          }

          await runWithLock(`game_${gameId}`, async () => {
            await notifyFollowers("game", userId, gameId);
          });
        }

        if (change.type === "modified") {
          const game = change.doc.data();
          const gameId = change.doc.id;
          const status = game.currentState?.status;

          // If the game just finished, run the finalization engine
          if (status === "completed" || status === "finished") {
            // Only finalize if it hasn't been finalized yet (check if summary or stats exist)
            if (!game.summary) {
              console.log(
                `[Listener] Game ${gameId} completed. Triggering finalization...`,
              );
              await runWithLock(`finalize_game_${gameId}`, async () => {
                await gameFinalizationService.finalizeGame(gameId);
              });
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
        const eventId = change.doc.id;
        const userId = event.userId || event.createdBy || event.authorId;

        console.log("New Event detected:", eventId, "by user:", userId);

        if (!userId) {
          console.warn(
            `Event ${eventId} has no valid userId. Skipping notification.`,
          );
          continue;
        }

        await runWithLock(`event_${eventId}`, async () => {
          await notifyFollowers("events", userId, eventId);
        });
      }
    }
  });
}

module.exports = {
  watchPosts,
  watchGames,
  watchEvents,
};
