const { db } = require("./config/firebase");
const gameFinalizationService = require("./services/gameFinalization.service");

async function runTest() {
  console.log("🚀 Starting Game Finalization Engine Test...");

  const testGameId = "test-game-finalization-" + Date.now();

  try {
    // 1. Create a mock game document
    console.log("Creating mock game...");
    const mockGame = {
      id: testGameId,
      type: "game",
      sport: "football",
      title: "Test Finalization Game",
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().split("T")[0],
      currentState: {
        status: "live",
        homeScore: 2,
        awayScore: 1,
      },
      data: {
        homeTeam: {
          id: "team-home",
          name: "Home Warriors",
          logo: "home_logo.png",
        },
        awayTeam: {
          id: "team-away",
          name: "Away Kings",
          logo: "away_logo.png",
        },
        players: [
          { id: "player-1", name: "Striker One" },
          { id: "player-2", name: "Midfielder Two" },
        ],
        gameEvents: [
          {
            id: "evt1",
            type: "goal",
            teamId: "team-home",
            playerId: "player-1",
            timestamp: 10,
          },
          {
            id: "evt2",
            type: "goal",
            teamId: "team-away",
            playerId: "player-2",
            timestamp: 25,
          },
          {
            id: "evt3",
            type: "goal",
            teamId: "team-home",
            playerId: "player-1",
            timestamp: 40,
          },
          {
            id: "evt4",
            type: "yellow_card",
            teamId: "team-away",
            playerId: "player-2",
            timestamp: 55,
          },
        ],
      },
    };

    await db.collection("games").doc(testGameId).set(mockGame);
    console.log(`Mock game created with ID: ${testGameId}`);

    // 2. Run Finalization
    console.log("Finalizing game...");
    await gameFinalizationService.finalizeGame(testGameId);

    // 3. Verify results
    const finalDoc = await db.collection("games").doc(testGameId).get();
    const finalData = finalDoc.data();

    console.log("\n--- TEST RESULTS ---");
    console.log("Status:", finalData.currentState.status);
    if (finalData.summary) {
      console.log("Summary Score:", finalData.summary.finalScore);
      console.log("Matchup:", finalData.summary.matchup);
      if (
        finalData.summary.topPerformers &&
        finalData.summary.topPerformers.length > 0
      ) {
        console.log(
          "Top Performer:",
          finalData.summary.topPerformers[0].name,
          "Rating:",
          finalData.summary.topPerformers[0].rating,
        );
      }
    }

    const homeGoalsStat = finalData.data.homeTeam.stats.find(
      (s) => s.label === "Goals",
    );
    const awayGoalsStat = finalData.data.awayTeam.stats.find(
      (s) => s.label === "Goals",
    );

    console.log(
      "Home Goals Stat:",
      homeGoalsStat ? homeGoalsStat.value : "N/A",
    );
    console.log(
      "Away Goals Stat:",
      awayGoalsStat ? awayGoalsStat.value : "N/A",
    );

    if (
      finalData.currentState.status === "completed" &&
      finalData.summary.finalScore === "2 - 1" &&
      homeGoalsStat?.value === 2 &&
      awayGoalsStat?.value === 1
    ) {
      console.log("\n✅ Test Passed!");
    } else {
      console.log("\n❌ Test Failed!");
    }

    // Cleanup
    console.log("\nCleaning up...");
    await db.collection("games").doc(testGameId).delete();
    console.log("Test document deleted.");

    process.exit(0);
  } catch (error) {
    console.error("Test Error:", error);
    process.exit(1);
  }
}

runTest();
