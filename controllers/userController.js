const { db } = require("../services/firebaseAdmin");

/* -------------------------------------------------------------
   GET ALL USERS
------------------------------------------------------------- */
const getUsers = async (req, res) => {
    try {
        const snapshot = await db.collection("users").get();

        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.status(200).json(users);
    } catch (err) {
        console.error("getUsers ERROR:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

/* -------------------------------------------------------------
   GET SINGLE USER
------------------------------------------------------------- */
const getUser = async (req, res) => {
    try {
        const userId = req.params.id;

        const snap = await db.collection("users").doc(userId).get();

        if (!snap.exists) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({
            id: snap.id,
            ...snap.data(),
        });
    } catch (err) {
        console.error("getUser ERROR:", err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
};

/* -------------------------------------------------------------
   DELETE USER
------------------------------------------------------------- */
const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const userRef = db.collection("users").doc(userId);

        const snap = await userRef.get();

        if (!snap.exists) {
            return res.status(404).json({ error: "User not found" });
        }

        await userRef.delete();

        res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("deleteUser ERROR:", err);
        res.status(500).json({ error: "Failed to delete user" });
    }
};

/* -------------------------------------------------------------
   SEARCH USERS (PREFIX SEARCH)
------------------------------------------------------------- */
const searchUsers = async (req, res) => {
    try {
        const query = (req.query.q || "").trim();

        if (!query) {
            return res.status(400).json({ error: "Missing search query" });
        }

        const snapshot = await db
            .collection("users")
            .orderBy("name")
            .startAt(query)
            .endAt(query + "\uf8ff")
            .limit(20)
            .get();

        const results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.status(200).json(results);
    } catch (err) {
        console.error("searchUsers ERROR:", err);
        res.status(500).json({ error: "Search failed" });
    }
};

module.exports = {
    getUsers,
    getUser,
    deleteUser,
    searchUsers,
};
