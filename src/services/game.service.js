const { db } = require("../config/firebase");
const gameFinalizationService = require("./gameFinalization.service");

/**
 * Marks a game as completed and triggers the finalization engine.
 * @param {string} gameId
 */
const completeGame = async (gameId) => {
  try {
    await db.collection("games").doc(gameId).update({
      "currentState.status": "completed",
      updatedAt: new Date().toISOString(),
    });

    // Trigger finalization logic
    await gameFinalizationService.finalizeGame(gameId);

    return { success: true, message: "Game completed and finalized" };
  } catch (error) {
    console.error(`Error completing game ${gameId}:`, error);
    throw error;
  }
};

const organizeGame = () => {
  // Placeholder for future organization logic
};

module.exports = {
  completeGame,
  organizeGame,
};
