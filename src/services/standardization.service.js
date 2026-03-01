const TEAM_STATS_LABELS = {
  football: [
    "Possession %",
    "Shots",
    "Shots on Target",
    "Fouls",
    "Yellow Cards",
    "Red Cards",
    "Corners",
  ],
  basketball: [
    "Points",
    "Rebounds",
    "Assists",
    "Steals",
    "Blocks",
    "Turnovers",
  ],
  baseball: ["Runs", "Hits", "Home Runs", "Errors"],
  americanFootball: [
    "Touchdowns",
    "Passing Yards",
    "Rushing Yards",
    "Turnovers",
  ],
  tennis: ["Aces", "Double Faults", "Break Points Won"],
  badminton: ["Smashes Won", "Rallies Won", "Errors"],
  volleyball: ["Points", "Spikes", "Blocks", "Aces", "Errors"],
  hockey: ["Goals", "Shots on Goal", "Penalties", "Saves"],
};

const PLAYER_STAT_TO_TEAM_LABEL = {
  football: {
    Gls: "Goals", // Score handled separately
    Sht: "Shots",
    ShtTarget: "Shots on Target",
    Tkl: "Fouls",
    Yel: "Yellow Cards",
    Red: "Red Cards",
    Crn: "Corners",
  },
  basketball: {
    Pts: "Points",
    Reb: "Rebounds",
    Ast: "Assists",
    Stl: "Steals",
    Blk: "Blocks",
    Tov: "Turnovers",
  },
  baseball: {
    Runs: "Runs",
    Hits: "Hits",
    HR: "Home Runs",
    Err: "Errors",
  },
  americanFootball: {
    TD: "Touchdowns",
    PassYds: "Passing Yards",
    RushYds: "Rushing Yards",
    Tov: "Turnovers",
  },
  tennis: {
    Ace: "Aces",
    DF: "Double Faults",
    BPW: "Break Points Won",
  },
  badminton: {
    SmW: "Smashes Won",
    RW: "Rallies Won",
    Err: "Errors",
  },
  volleyball: {
    Pts: "Points",
    Spk: "Spikes",
    Blk: "Blocks",
    Ace: "Aces",
    Err: "Errors",
  },
  hockey: {
    Gls: "Goals",
    SOG: "Shots on Goal",
    Pen: "Penalties",
    Sav: "Saves",
  },
};

const SPORT_SCORE_KEY = {
  football: "Gls",
  basketball: "Pts",
  baseball: "Runs",
  americanFootball: "Pts",
  hockey: "Gls",
  tennis: "Sets",
  volleyball: "Pts",
  badminton: "Pts",
};

/**
 * Service to standardize game data by re-calculating team stats and scores.
 */
class StandardizationService {
  /**
   * Standardizes the game data object.
   * @param {Object} gameData - The 'data' field from the event document.
   * @param {Object} currentState - The 'currentState' field from the event document.
   * @returns {Object} { gameData, currentState }
   */
  static standardize(gameData, currentState, sport) {
    const sportKey = (sport || "football").toLowerCase();
    const teamStatsLabels =
      TEAM_STATS_LABELS[sportKey] || TEAM_STATS_LABELS.football;
    const statMapping =
      PLAYER_STAT_TO_TEAM_LABEL[sportKey] || PLAYER_STAT_TO_TEAM_LABEL.football;
    const scoreKey = SPORT_SCORE_KEY[sportKey] || "Gls";

    // 1. Process Home Team
    const homeTeamResult = this.calculateTeamAggregation(
      gameData.homeTeam,
      teamStatsLabels,
      statMapping,
      scoreKey,
    );
    gameData.homeTeam.stats = homeTeamResult.teamStats;
    currentState.homeScore = homeTeamResult.totalScore;

    // 2. Process Away Team
    const awayTeamResult = this.calculateTeamAggregation(
      gameData.awayTeam,
      teamStatsLabels,
      statMapping,
      scoreKey,
    );
    gameData.awayTeam.stats = awayTeamResult.teamStats;
    currentState.awayScore = awayTeamResult.totalScore;

    // 3. Could also process gameEvents here if needed to reconcile player stats
    // For now, we trust the player stats as requested.

    return { gameData, currentState };
  }

  static calculateTeamAggregation(team, labels, statMapping, scoreKey) {
    let totalScore = 0;
    const aggregatedStats = {};

    // Initialize all labels to 0 (or 50 for Possession)
    labels.forEach((label) => {
      aggregatedStats[label] = label === "Possession %" ? 50 : 0;
    });

    if (team.players && Array.isArray(team.players)) {
      team.players.forEach((player) => {
        if (player.stats) {
          // Add to score
          totalScore += Number(player.stats[scoreKey] || 0);

          // Add to team stats
          Object.keys(player.stats).forEach((playerStatKey) => {
            const teamLabel = statMapping[playerStatKey];
            if (teamLabel && aggregatedStats[teamLabel] !== undefined) {
              aggregatedStats[teamLabel] += Number(
                player.stats[playerStatKey] || 0,
              );
            }
          });
        }
      });
    }

    // Convert back to the list format used in the DB
    const teamStats = labels.map((label) => ({
      label: label,
      value: aggregatedStats[label],
    }));

    return { teamStats, totalScore };
  }
}

module.exports = StandardizationService;
