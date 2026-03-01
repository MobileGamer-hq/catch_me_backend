const { Firestore } = require("../utils/db");
const standardizationService = require("../services/standardization.service");
const { db } = require("../config/firebase");

/**
 * Fetches all games (events with type 'game')
 */
const getGames = async (req, res) => {
  try {
    const snapshot = await db
      .collection("events")
      .where("type", "==", "game")
      .get();
    const games = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(games);
  } catch (error) {
    console.error("Error fetching games:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch games", details: error.message });
  }
};

/**
 * Fetches a single game by ID
 */
const getGame = async (req, res) => {
  try {
    const game = await Firestore.getById("events", req.params.id);

    if (!game || game.type !== "game") {
      return res.status(404).json({ error: "Game not found" });
    }

    res.status(200).json(game);
  } catch (err) {
    console.error("Error fetching game:", err);
    res.status(500).json({ error: "Failed to fetch game" });
  }
};

/**
 * Standardizes game data (re-computes scores and team stats)
 */
const standardizeGame = async (req, res) => {
  try {
    const gameId = req.params.id;
    const gameDoc = await Firestore.getById("events", gameId);

    if (!gameDoc || gameDoc.type !== "game") {
      return res.status(404).json({ error: "Game not found" });
    }

    // Extract fields
    let { data, currentState, sport } = gameDoc;

    if (!data || !currentState) {
      return res
        .status(400)
        .json({
          error:
            "Game document is missing required 'data' or 'currentState' fields",
        });
    }

    // Call service to standardize
    const result = standardizationService.standardize(
      data,
      currentState,
      sport,
    );

    // Update Firestore
    const updates = {
      data: result.gameData,
      currentState: result.currentState,
      updatedAt: new Date().toISOString(),
    };

    const updatedGame = await Firestore.updateById("events", gameId, updates);

    res.status(200).json({
      message: "Game standardized successfully",
      game: updatedGame,
    });
  } catch (error) {
    console.error("Error standardizing game:", error);
    res
      .status(500)
      .json({ error: "Failed to standardize game", details: error.message });
  }
};

const endGame = async (req, res) => {
  try {
    const game = await Firestore.getById("events", req.params.id);

    if (!game || game.type !== "game") {
      return res.status(404).json({ error: "Game not found" });
    }

    // Simple status update for now
    const updates = {
      "currentState.status": "ended",
      updatedAt: new Date().toISOString(),
    };

    const updatedGame = await Firestore.updateById(
      "events",
      req.params.id,
      updates,
    );

    res.status(200).json(updatedGame);
  } catch (err) {
    console.error("Error ending game:", err);
    res.status(500).json({ error: "Failed to end game" });
  }
};

module.exports = { getGames, getGame, endGame, standardizeGame };
