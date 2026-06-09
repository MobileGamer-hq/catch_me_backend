const { Firestore } = require("../utils/db");
const standardizationService = require("../services/standardization.service");
const { db, realtime } = require("../config/firebase");
const pdfService = require("../services/pdf.service");
const aiService = require("../services/aiService");

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

const exportGamePdfLink = async (req, res) => {
  try {
    const gameId = req.params.id;
    // Return the link that streams the PDF
    const downloadUrl = `${req.protocol}://${req.get("host")}/api/games/${gameId}/download`;
    res.status(200).json({ downloadUrl });
  } catch (error) {
    console.error("Error exporting PDF link:", error);
    res.status(500).json({ error: "Failed to generate download link" });
  }
};

const downloadGamePdf = async (req, res) => {
  try {
    const game = await Firestore.getById("events", req.params.id);
    if (!game || game.type !== "game") {
      return res.status(404).json({ error: "Game not found" });
    }

    const pdfBuffer = await pdfService.generateGamePdf(game);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=game_${game.id}.pdf`
    );
    res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};

/**
 * Creates an AI summary for a game and stores it in the Realtime Database.
 */
const createSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const summaryRef = realtime.ref(`game_summaries/${id}`);
    const snapshot = await summaryRef.once("value");

    if (snapshot.exists()) {
      return res.status(200).json(snapshot.val());
    }

    // Fetch the game data from Firestore
    const gameDoc = await Firestore.getById("events", id);
    if (!gameDoc || gameDoc.type !== "game") {
      return res.status(404).json({ error: "Game not found" });
    }

    // Generate summary
    const summaryText = await aiService.generateGameSummary(gameDoc);

    const summaryData = {
      summary: summaryText,
      updatedAt: Date.now()
    };

    await summaryRef.set(summaryData);

    res.status(201).json(summaryData);
  } catch (error) {
    console.error("Error creating game summary:", error);
    res.status(500).json({ error: "Failed to create game summary", details: error.message });
  }
};

/**
 * Updates an AI summary if it's older than 10 minutes.
 */
const updateSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const summaryRef = realtime.ref(`game_summaries/${id}`);
    const snapshot = await summaryRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Summary not found. Please create one first." });
    }

    const currentSummary = snapshot.val();
    const tenMinutes = 10 * 60 * 1000;

    if (Date.now() - currentSummary.updatedAt < tenMinutes) {
      return res.status(400).json({ 
        message: "Summary was updated recently. Please wait before updating again.",
        summary: currentSummary 
      });
    }

    // Fetch the game data from Firestore
    const gameDoc = await Firestore.getById("events", id);
    if (!gameDoc || gameDoc.type !== "game") {
      return res.status(404).json({ error: "Game not found" });
    }

    // Generate new summary
    const newSummaryText = await aiService.generateGameSummary(gameDoc);

    const updatedData = {
      summary: newSummaryText,
      updatedAt: Date.now()
    };

    await summaryRef.update(updatedData);

    res.status(200).json(updatedData);
  } catch (error) {
    console.error("Error updating game summary:", error);
    res.status(500).json({ error: "Failed to update game summary", details: error.message });
  }
};

/**
 * Deletes an AI summary from the Realtime Database.
 */
const deleteSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const summaryRef = realtime.ref(`game_summaries/${id}`);
    await summaryRef.remove();
    
    res.status(200).json({ message: "Game summary deleted successfully" });
  } catch (error) {
    console.error("Error deleting game summary:", error);
    res.status(500).json({ error: "Failed to delete game summary", details: error.message });
  }
};

module.exports = { 
  getGames, 
  getGame, 
  endGame, 
  standardizeGame, 
  exportGamePdfLink, 
  downloadGamePdf,
  createSummary,
  updateSummary,
  deleteSummary
};
