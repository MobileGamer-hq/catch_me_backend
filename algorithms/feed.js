const { Realtime, Firestore } = require("../methods/database");
const { db } = require("../services/firebaseAdmin");

/* -------------------------------------------------------------
   MAIN FEED GENERATION
------------------------------------------------------------- */
async function generateUserFeed(userId) {
    const user = await Firestore.getById('users', userId);
    if (!user) throw new Error(`User ${userId} not found`);

    const posts = await getFeedPosts(user);
    const games = await getFeedGames(user);

    const feed = {
        posts,
        games,
    };

    await updateFeedInRealtimeDB(userId, { data: feed });

    return feed;
}

/* -------------------------------------------------------------
   1. POSTS FEED
------------------------------------------------------------- */
async function getFeedPosts(user) {
    try {
        const following = user.following || [];
        const interestedSports = user.interestedSports || [];

        let queries = [];

        // Posts by followed users
        if (following.length > 0) {
            queries.push(
                Firestore.firestore()
                    .collection("posts")
                    .where("userId", "in", following)
                    .orderBy("createdAt", "desc")
                    .limit(40)
            );
        }

        // Posts by sport interest
        if (interestedSports.length > 0) {
            queries.push(
                Firestore.firestore()
                    .collection("posts")
                    .where("sport", "in", interestedSports)
                    .orderBy("createdAt", "desc")
                    .limit(40)
            );
        }

        // Fallback trending posts
        queries.push(
            Firestore.firestore()
                .collection("posts")
                .orderBy("engagementScore", "desc")
                .limit(40)
        );

        const snapshots = await Promise.all(queries.map(q => q.get()));

        // Merge + dedupe
        const merged = new Map();

        snapshots.forEach(snap => {
            snap.forEach(doc => {
                merged.set(doc.id, { id: doc.id, ...doc.data() });
            });
        });

        let feed = Array.from(merged.values());

        // Ranking
        feed.forEach(p => {
            p.score =
                (p.likes || 0) +
                (p.comments || 0) * 2 +
                (p.shares || 0) * 3 +
                ((p.createdAt?.toMillis?.() ?? 0) / 1e12);
        });

        feed.sort((a, b) => b.score - a.score);


        // Split by type
        const highlights = [];
        const images = [];
        const thoughts = [];

        for (let post of feed) {
            const type = (post.type || "").toLowerCase();
            if(getBaseId(post.id) === user.id) continue;
            if (type === "highlight") {
                highlights.push(post.id);
            } else if (type === "image-post" || type === "photo" || post.imageUrl) {
                images.push(post.id);
            } else {
                thoughts.push(post.id);
            }
        }

        return {
            highlights: highlights.slice(0, 100),
            images: images.slice(0, 100),
            thoughts: thoughts.slice(0, 100),
        };

    } catch (err) {
        console.error("getFeedPosts ERROR:", err);
        return { highlights: [], images: [], thoughts: [] };
    }
}

function getBaseId(fullId) {
    if (!fullId) return null;
    const index = fullId.indexOf('-');
    return index === -1 ? fullId : fullId.slice(0, index);
}


/* -------------------------------------------------------------
   2. GAMES FEED (EVENTS TYPE: GAME)
------------------------------------------------------------- */
async function getFeedGames(user) {
    try {
        const following = user.following || [];
        const interestedSports = user.interestedSports || [];
        const userTags = user.tags || [];

        // Pull only game events
        const eventsSnap = await Firestore.firestore()
            .collection("events")
            .where("type", "==", "game")
            .orderBy("createdAt", "desc")
            .limit(120)
            .get();

        let games = [];

        eventsSnap.forEach(doc => {
            // console.log(doc.data());

            const e = { id: doc.id, ...doc.data() };

                const eventUserId = e.userId || getBaseId( e.id);
                const eventSport = e.sport;
                const eventDataSport = e.data?.sport;
                const eventTags = Array.isArray(e.tags) ? e.tags : [];

                console.log(`ID OF USER ${eventUserId}`)

            const matchesFollowing =following.includes(eventUserId);

            const matchesSport =
                    interestedSports.includes(eventSport) ||
                    interestedSports.includes(eventDataSport);


            const matchesTags =
                    userTags.length > 0 &&
                    eventTags.length > 0 &&
                    eventTags.some(tag => userTags.includes(tag));

            if (
                    (matchesFollowing ||
                    matchesSport ||
                    matchesTags ||
                    (interestedSports.length === 0 && userTags.length === 0) ) && eventUserId !== user.id
                ) {
                    games.push(e.id);
                }

        })

        return games.slice(0, 100);

    } catch (err) {
        console.error("getFeedGames ERROR:", err);
        return [];
    }
}



/* -------------------------------------------------------------
   3. SAVE FEED
------------------------------------------------------------- */
async function updateFeedInRealtimeDB(userId, feed) {
    await Realtime.update(`feed/${userId}`, feed);
}

module.exports = { generateUserFeed };
