const { db } = require("../config/firebase");
const { notifyFollowers } = require("./notification.service");
const gameFinalizationService = require("./gameFinalization.service");
const { Cache } = require("../utils/cache");

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

          // 2. Redis Feed Cache Invalidation (Replaces expensive Firestore subcollection writes)
          try {
            const authorDoc = await db.collection("users").doc(userId).get();
            const author = authorDoc.data();

            if (author && author.followers && Array.isArray(author.followers) && author.followers.length > 0) {
              const evictionPromises = [];
              for (const followerId of author.followers) {
                evictionPromises.push(Cache.del(`feed:${followerId}:all:A`));
                evictionPromises.push(Cache.del(`feed:${followerId}:all:B`));
                evictionPromises.push(Cache.del(`feed:granular:${followerId}:posts:all:all:A`));
                evictionPromises.push(Cache.del(`feed:granular:${followerId}:posts:all:all:B`));
              }
              await Promise.all(evictionPromises);
              console.log(
                `[Listener] Evicted Redis feed caches for ${author.followers.length} followers of post ${postId}.`,
              );
            }
          } catch (err) {
            console.error("Feed cache invalidation failed:", err);
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

/* ────────────────────────────────────────────────
   Watch USERS (Real-time Local Search Index Sync)
 ────────────────────────────────────────────────── */
function watchUsers() {
  const localSearchService = require("./localSearch.service");
  let isInitialLoad = true;

  db.collection("users").onSnapshot((snapshot) => {
    if (isInitialLoad) {
      isInitialLoad = false;
      console.log("[Listener] Initializing users real-time listener");
      return;
    }

    for (const change of snapshot.docChanges()) {
      const userId = change.doc.id;
      const user = change.doc.data();

      if (change.type === "added" || change.type === "modified") {
        console.log(`[Listener] User ${userId} (${user.username || user.name}) ${change.type}. Updating search index...`);
        localSearchService.upsertUser(userId, user);
      } else if (change.type === "removed") {
        console.log(`[Listener] User ${userId} removed. Updating search index...`);
        localSearchService.removeUser(userId);
      }
    }
  }, (err) => {
    console.error("[Listener] watchUsers error:", err.message);
  });
}

module.exports = {
  watchPosts,
  watchGames,
  watchEvents,
  watchUsers,
};
