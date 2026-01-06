const { Firestore } = require("../methods/database");
const {db} = require("../services/firebaseAdmin"); // adjust path if needed

const getGames = async (req, res) => {
    try {
        const snapshot = await eventsCollection.where("type", "==", "game").get();
        const games = snapshot.docs.map(doc => doc.data());
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ error: "Failed to get events by type", details: error.message });
    }
};

const getGame = async (req, res) => {
    try {
        const game = await Firestore.getById("events", req.params.id);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
};

const endGame = async (req, res) => {
    try {
        const game = await Firestore.getById("events", req.params.id);



        if (!game) {
            return res.status(404).json({ error: "Game not found" });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch game" });
    }
}


module.exports = { getGames, getGame, endGame };
