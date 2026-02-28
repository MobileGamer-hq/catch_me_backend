const { db } = require("../config/firebase");

/**
 * GameFinalizationService
 * Handles the logic for processing a game after it has completed.
 * This includes validating events, aggregating team and player stats,
 * and generating a UI-optimized summary.
 */
class GameFinalizationService {
  /**
   * Finalizes a game by aggregating stats and generating a summary.
   * @param {string} gameId
   */
  async finalizeGame(gameId) {
    console.log(`[GameFinalization] Finalizing game: ${gameId}`);
    try {
      const gameRef = db.collection("games").doc(gameId);
      const gameDoc = await gameRef.get();

      if (!gameDoc.exists) {
        console.error(`[GameFinalization] Game with ID ${gameId} not found`);
        return;
      }

      const gameData = gameDoc.data();

      // Only process if it's actually finished (protect against accidental triggers)
      if (
        gameData.currentState?.status !== "completed" &&
        gameData.currentState?.status !== "finished"
      ) {
        console.warn(
          `[GameFinalization] Game ${gameId} status is ${gameData.currentState?.status}, skipping finalization.`,
        );
        // return; // Commented out to allow manual triggering if status isn't set yet
      }

      const events = gameData.data?.gameEvents || [];
      const sport = gameData.sport || "football";

      // 1. Validate Events (Remove duplicates, ensure consistency)
      const validatedEvents = this.validateEvents(events);

      // 2. Aggregate Team Stats
      const teamStats = this.aggregateTeamStats(validatedEvents, gameData.data);

      // 3. Aggregate Player Stats
      const players = gameData.data?.players || [];
      const playerStats = this.aggregatePlayerStats(validatedEvents, players);

      // 4. Generate UI Summary
      const summary = this.generateUISummary(gameData, teamStats, playerStats);

      // 5. Update Database
      await gameRef.update({
        "data.stats": teamStats.overall,
        "data.homeTeam.stats": teamStats.home,
        "data.awayTeam.stats": teamStats.away,
        "data.playerStats": playerStats,
        summary: summary,
        updatedAt: new Date().toISOString(),
        "currentState.status": "completed", // Ensure status is explicitly marked
      });

      console.log(`[GameFinalization] Game ${gameId} finalized successfully.`);
      return true;
    } catch (error) {
      console.error(
        `[GameFinalization] Error finalizing game ${gameId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Validates and cleans up game events.
   */
  validateEvents(events) {
    const seenIds = new Set();
    return events.filter((event) => {
      if (!event) return false;
      if (event.id && seenIds.has(event.id)) return false;
      if (event.id) seenIds.add(event.id);
      return true;
    });
  }

  /**
   * Aggregates stats for home and away teams.
   */
  aggregateTeamStats(events, data) {
    const homeId = data.homeTeam?.id;
    const awayId = data.awayTeam?.id;

    const stats = {
      home: {
        goals: 0,
        shots: 0,
        fouls: 0,
        yellowCards: 0,
        redCards: 0,
        possession: 50,
      },
      away: {
        goals: 0,
        shots: 0,
        fouls: 0,
        yellowCards: 0,
        redCards: 0,
        possession: 50,
      },
      overall: [],
    };

    events.forEach((event) => {
      const side =
        event.teamId === homeId
          ? "home"
          : event.teamId === awayId
            ? "away"
            : null;
      if (!side) return;

      const type = (event.type || "").toLowerCase();
      if (type.includes("goal")) stats[side].goals++;
      else if (type.includes("shot")) stats[side].shots++;
      else if (type.includes("foul")) stats[side].fouls++;
      else if (type.includes("yellow")) stats[side].yellowCards++;
      else if (type.includes("red")) stats[side].redCards++;
    });

    // Convert to array format for UI consistency
    const homeArray = Object.entries(stats.home).map(([key, value]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value,
    }));
    const awayArray = Object.entries(stats.away).map(([key, value]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value,
    }));

    const overallArray = [
      { label: "Total Goals", value: stats.home.goals + stats.away.goals },
      { label: "Total Events", value: events.length },
    ];

    return { home: homeArray, away: awayArray, overall: overallArray };
  }

  /**
   * Aggregates stats for individual players and calculates a simple rating.
   */
  aggregatePlayerStats(events, players) {
    const playerStatsMap = {};

    // Initialize all players in the rosters
    players.forEach((p) => {
      const id = typeof p === "string" ? p : p.id;
      if (!id) return;
      playerStatsMap[id] = {
        id,
        name: p.name || "Unknown",
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        rating: 6.0,
      };
    });

    events.forEach((event) => {
      if (!event.playerId) return;

      // Handle dynamically added players not in initial roster
      if (!playerStatsMap[event.playerId]) {
        playerStatsMap[event.playerId] = {
          id: event.playerId,
          name: event.playerName || "Unknown",
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          rating: 6.0,
        };
      }

      const pStats = playerStatsMap[event.playerId];
      const type = (event.type || "").toLowerCase();

      if (type.includes("goal")) {
        pStats.goals++;
        pStats.rating += 1.5;
        if (event.assistPlayerId && playerStatsMap[event.assistPlayerId]) {
          playerStatsMap[event.assistPlayerId].assists++;
          playerStatsMap[event.assistPlayerId].rating += 0.8;
        }
      } else if (type.includes("yellow")) {
        pStats.yellowCards++;
        pStats.rating -= 0.5;
      } else if (type.includes("red")) {
        pStats.redCards++;
        pStats.rating -= 2.0;
      } else if (type.includes("shot")) {
        pStats.rating += 0.1;
      }
    });

    // Cap ratings between 1.0 and 10.0
    Object.values(playerStatsMap).forEach((p) => {
      p.rating = Math.min(10, Math.max(1, Math.round(p.rating * 10) / 10));
    });

    return Object.values(playerStatsMap);
  }

  /**
   * Creates a condensed map for the UI summary view.
   */
  generateUISummary(gameData, teamStats, playerStats) {
    const homeScore = gameData.currentState?.homeScore || 0;
    const awayScore = gameData.currentState?.awayScore || 0;

    return {
      finalScore: `${homeScore} - ${awayScore}`,
      gameDate: gameData.date || gameData.createdAt,
      matchup: `${gameData.data?.homeTeam?.name || "Home"} vs ${gameData.data?.awayTeam?.name || "Away"}`,
      homeTeam: {
        id: gameData.data?.homeTeam?.id,
        name: gameData.data?.homeTeam?.name,
        logo: gameData.data?.homeTeam?.logo,
        score: homeScore,
        stats: teamStats.home,
      },
      awayTeam: {
        id: gameData.data?.awayTeam?.id,
        name: gameData.data?.awayTeam?.name,
        logo: gameData.data?.awayTeam?.logo,
        score: awayScore,
        stats: teamStats.away,
      },
      topPerformers: playerStats
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3),
      timeline: (gameData.data?.gameEvents || [])
        .filter((e) =>
          ["goal", "yellow_card", "red_card"].some((type) =>
            e.type?.toLowerCase().includes(type),
          ),
        )
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)),
    };
  }
}

module.exports = new GameFinalizationService();
