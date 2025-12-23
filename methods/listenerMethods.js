const { db } = require("../services/firebaseAdmin");
const { notifyFollowers } = require("./notificationMethods");

/* ────────────────────────────────────────────────
   Watch NEW POSTS
────────────────────────────────────────────────── */
function watchPosts() {
    let isInitialLoad = true;

    db.collection("posts").onSnapshot(async snapshot => {
        if (isInitialLoad) {
            isInitialLoad = false;
            return;
        }

        for (const change of snapshot.docChanges()) {
            if (change.type === "added") {
                const post = change.doc.data();
                console.log("🔥 New Post:", post.id);

                await notifyFollowers(
                    "post",
                    post.userId,
                    post.id     // use Firestore doc ID
                );
            }
        }
    });
}

/* ────────────────────────────────────────────────
   Watch NEW GAMES
────────────────────────────────────────────────── */
function watchGames() {
    let isInitialLoad = true;

    db.collection("games").onSnapshot(async snapshot => {
        // if (isInitialLoad) {
        //     isInitialLoad = false;
        //     return;
        // }

        for (const change of snapshot.docChanges()) {
            if (change.type === "added") {
                const game = change.doc.data();
                console.log("🏀 New Game:", game.id);

                await notifyFollowers(
                    "game",
                    game.userId || game.createdBy,   // adjust to your field name
                    game.id
                );
            }
        }
    });
}

/* ────────────────────────────────────────────────
   Watch NEW EVENTS
────────────────────────────────────────────────── */
function watchEvents() {
    let isInitialLoad = true;

    db.collection("events").onSnapshot(async snapshot => {
        if (isInitialLoad) {
            isInitialLoad = false;
            return;
        }

        for (const change of snapshot.docChanges()) {
            if (change.type === "added") {
                const event = change.doc.data();
                console.log("📅 New Event:", change.doc.id);

                await notifyFollowers(
                    "events",
                    event.userId || event.userId,
                    event.id
                );
            }
        }
    });
}

module.exports = {
    watchPosts,
    watchGames,
    watchEvents
};
