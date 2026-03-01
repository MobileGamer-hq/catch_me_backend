const StandardizationService = require("./services/standardization.service");

function testStandardization() {
  console.log("🚀 Starting Standardization Logic Test...");

  const mockGameData = {
    homeTeam: {
      name: "Home Team",
      players: [
        { name: "Player 1", stats: { Gls: 2, Sht: 5, Ast: 1 } },
        { name: "Player 2", stats: { Gls: 1, Sht: 2, Yel: 1 } },
      ],
      stats: [],
    },
    awayTeam: {
      name: "Away Team",
      players: [{ name: "Player 3", stats: { Gls: 1, Sht: 10, Tkl: 3 } }],
      stats: [],
    },
  };

  const mockCurrentState = {
    homeScore: 0,
    awayScore: 0,
    status: "live",
  };

  console.log("Initial State:", JSON.stringify(mockCurrentState));

  const result = StandardizationService.standardize(
    mockGameData,
    mockCurrentState,
    "football",
  );

  console.log("\n--- TEST RESULTS ---");
  console.log(
    "Final Scores:",
    result.currentState.homeScore,
    "-",
    result.currentState.awayScore,
  );

  const homeShots = result.gameData.homeTeam.stats.find(
    (s) => s.label === "Shots",
  ).value;
  const awayFouls = result.gameData.awayTeam.stats.find(
    (s) => s.label === "Fouls",
  ).value;

  console.log("Home Team Shots (Expected 7):", homeShots);
  console.log("Away Team Fouls (Expected 3):", awayFouls);

  if (
    result.currentState.homeScore === 3 &&
    result.currentState.awayScore === 1 &&
    homeShots === 7 &&
    awayFouls === 3
  ) {
    console.log("\n✅ Standardization Logic Test Passed!");
  } else {
    console.log("\n❌ Standardization Logic Test Failed!");
    process.exit(1);
  }
}

testStandardization();
