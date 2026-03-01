const TEAM_PERFORMANCE_STATS = {
  football: [
    { label: "Possession %", value: 50 },
    { label: "Shots", value: 0 },
    { label: "Shots on Target", value: 0 },
    { label: "Fouls", value: 0 },
    { label: "Yellow Cards", value: 0 },
    { label: "Red Cards", value: 0 },
    { label: "Corners", value: 0 },
  ],
  basketball: [
    { label: "Points", value: 0 },
    { label: "Rebounds", value: 0 },
    { label: "Assists", value: 0 },
    { label: "Steals", value: 0 },
    { label: "Blocks", value: 0 },
    { label: "Turnovers", value: 0 },
  ],
  baseball: [
    { label: "Runs", value: 0 },
    { label: "Hits", value: 0 },
    { label: "Home Runs", value: 0 },
    { label: "Errors", value: 0 },
  ],
  americanFootball: [
    { label: "Touchdowns", value: 0 },
    { label: "Passing Yards", value: 0 },
    { label: "Rushing Yards", value: 0 },
    { label: "Turnovers", value: 0 },
  ],
  tennis: [
    { label: "Aces", value: 0 },
    { label: "Double Faults", value: 0 },
    { label: "Break Points Won", value: 0 },
  ],
  badminton: [
    { label: "Smashes Won", value: 0 },
    { label: "Rallies Won", value: 0 },
    { label: "Errors", value: 0 },
  ],
  volleyball: [
    { label: "Points", value: 0 },
    { label: "Spikes", value: 0 },
    { label: "Blocks", value: 0 },
    { label: "Aces", value: 0 },
    { label: "Errors", value: 0 },
  ],
  hockey: [
    { label: "Goals", value: 0 },
    { label: "Shots on Goal", value: 0 },
    { label: "Penalties", value: 0 },
    { label: "Saves", value: 0 },
  ],
};

const STAT_TO_TEAM_STAT = {
  Gls: "Goals",
  Ast: "Assists",
  Tkl: "Fouls", // Simple mapping for demonstration
  Sht: "Shots",
  ShtTarget: "Shots on Target",
  Yel: "Yellow Cards",
  Red: "Red Cards",
  Crn: "Corners",
  // Basketball
  Pts: "Points",
  Reb: "Rebounds",
  Stl: "Steals",
  Blk: "Blocks",
  Tov: "Turnovers",
};

/**
 * GameSystem handles the logic for a single game instance.
 * It mirrors the logic found in the Flutter 'GameSystem' class.
 */
class GameSystem {
  /**
   * @param {Object} game - The game document from Firestore
   */
  constructor(game) {
    this.game = game;
    this.updatedData = new Set();
    this.initializeTeamStats();
  }

  initializeTeamStats() {
    const sport = (this.game.sport || "football").toLowerCase();
    const defaultStats =
      TEAM_PERFORMANCE_STATS[sport] || TEAM_PERFORMANCE_STATS.football;

    if (
      this.game.data.homeTeam &&
      (!this.game.data.homeTeam.stats ||
        this.game.data.homeTeam.stats.length === 0)
    ) {
      this.game.data.homeTeam.stats = JSON.parse(JSON.stringify(defaultStats));
      this.markDirty("data.homeTeam.stats");
    }
    if (
      this.game.data.awayTeam &&
      (!this.game.data.awayTeam.stats ||
        this.game.data.awayTeam.stats.length === 0)
    ) {
      this.game.data.awayTeam.stats = JSON.parse(JSON.stringify(defaultStats));
      this.markDirty("data.awayTeam.stats");
    }
  }

  /* ───────────── GAME FLOW ───────────── */

  startGame() {
    if (
      this.game.currentState.status !== "scheduled" &&
      this.game.currentState.status !== "periodEnd"
    ) {
      return;
    }

    this.game.currentState.status = "ongoing";
    this.game.currentState.period = this.game.currentState.period || 1;
    this.game.currentState.timeLeft = this.game.duration * 60 * 1000;
    this.game.currentState.timerStart = new Date().toISOString();

    this.markDirty("currentState");

    this.addEvent({
      type: "gameStart",
      description: "Game Started",
      team: "none",
    });
  }

  pauseGame() {
    if (this.game.currentState.status !== "ongoing") return;

    this.game.currentState.timeLeft = this.calculateTimeLeft();
    this.game.currentState.status = "paused";

    this.markDirty("currentState");

    this.addEvent({
      type: "gamePause",
      description: "Game Paused",
      team: "none",
    });
  }

  resumeGame() {
    if (this.game.currentState.status !== "paused") return;

    this.game.currentState.timerStart = new Date().toISOString();
    this.game.currentState.status = "ongoing";

    this.markDirty("currentState");

    this.addEvent({
      type: "gameResume",
      description: "Game Resumed",
      team: "none",
    });
  }

  endGame() {
    if (
      this.game.currentState.status !== "ongoing" &&
      this.game.currentState.status !== "paused"
    ) {
      return;
    }

    if (this.game.currentState.period >= (this.game.periods || 1)) {
      this.game.currentState.status = "ended";
      this.game.currentState.timeLeft = 0;

      this.markDirty("currentState");

      this.addEvent({
        type: "gameEnd",
        description: "Game Ended",
        team: "none",
      });
      return;
    }

    this.game.currentState.status = "periodEnd";
    this.game.currentState.timeLeft = this.game.duration * 60 * 1000;
    this.game.currentState.period++;

    this.markDirty("currentState");

    this.addEvent({
      type: "periodEnd",
      description: "Period ended",
      team: "none",
    });
  }

  /* ───────────── PLAYER SELECTION & STATS ───────────── */

  /**
   * Increment a stat for a player
   * @param {string} teamSide - 'home' or 'away'
   * @param {number} playerIndex - Index in the players array of the team
   * @param {string} statKey - e.g., 'Gls', 'Ast'
   * @param {number} value - Amount to increment
   */
  incrementStat(teamSide, playerIndex, statKey, value = 1) {
    const team = this.getTeam(teamSide);
    if (!team || !team.players[playerIndex]) return;

    const player = team.players[playerIndex];
    if (!player.stats) player.stats = {};

    const current = player.stats[statKey] || 0;
    player.stats[statKey] = current + value;

    this.markDirty(`data.${teamSide}Team.players`);

    // Mapping stat to event type
    let eventType = "custom";
    if (statKey === "Gls") eventType = "score";
    else if (statKey === "Ast") eventType = "assist";
    else if (statKey === "Tkl") eventType = "tackle";
    else if (statKey === "Pas") eventType = "pass";
    else if (statKey === "Sht") eventType = "shotAttempt";

    this.addEvent({
      type: eventType,
      description: `${player.name} +${value} ${statKey}`,
      team: teamSide,
      playerIndex: playerIndex,
      level: value,
    });

    // Update Team Stats
    const teamStatLabel = STAT_TO_TEAM_STAT[statKey];
    if (teamStatLabel && team.stats) {
      const statObj = team.stats.find((s) => s.label === teamStatLabel);
      if (statObj) {
        statObj.value += value;
        this.markDirty(`data.${teamSide}Team.stats`);
      }
    }

    // Recalculate scores if it's a scoring event
    if (eventType === "score") {
      this.calculateCurrentScores();
    }
  }

  calculateCurrentScores() {
    const homeScore = this.calculateScore("home");
    const awayScore = this.calculateScore("away");

    if (
      this.game.currentState.homeScore !== homeScore ||
      this.game.currentState.awayScore !== awayScore
    ) {
      this.game.currentState.homeScore = homeScore;
      this.game.currentState.awayScore = awayScore;
      this.markDirty("currentState");
    }
  }

  calculateScore(teamSide) {
    const team = this.getTeam(teamSide);
    if (!team) return 0;

    // Assuming 'Gls' is the score key for most sports, or use a mapping
    const scoreKey = "Gls";
    return team.players.reduce((sum, p) => sum + (p.stats?.[scoreKey] || 0), 0);
  }

  /* ───────────── LINEUP & SUBSTITUTIONS ───────────── */

  substitutePlayer(teamSide, outIndex, inIndex) {
    const team = this.getTeam(teamSide);
    if (!team || !team.players[outIndex] || !team.players[inIndex]) return;

    const playerOut = team.players[outIndex];
    const playerIn = team.players[inIndex];

    // Mirroring frontend logic: update status and lineup lists
    playerOut.status = "substitute";
    playerIn.status = "active";

    const lineUp = team.lineUp;
    if (lineUp) {
      // Find and replace in active list
      const activeIdx = lineUp.active.indexOf(outIndex);
      if (activeIdx !== -1) {
        lineUp.active[activeIdx] = inIndex;
      }

      // Find and replace in substitutes list
      const subIdx = lineUp.substitutes.indexOf(inIndex);
      if (subIdx !== -1) {
        lineUp.substitutes[subIdx] = outIndex;
      }

      // Update positions mapping
      for (const posId in lineUp.positions) {
        if (lineUp.positions[posId].playerIndex === outIndex) {
          lineUp.positions[posId].playerIndex = inIndex;
          break;
        }
      }
    }

    this.markDirty(`data.${teamSide}Team`);

    this.addEvent({
      type: "substitution",
      description: `${playerOut.name} substituted for ${playerIn.name}`,
      team: teamSide,
    });
  }

  /* ───────────── HELPERS ───────────── */

  getTeam(side) {
    return side === "home" ? this.game.data.homeTeam : this.game.data.awayTeam;
  }

  calculateTimeLeft() {
    if (this.game.currentState.status === "ongoing") {
      const now = new Date();
      const startTime = new Date(this.game.currentState.timerStart);
      const elapsed = now.getTime() - startTime.getTime();
      const remaining = Math.max(0, this.game.currentState.timeLeft - elapsed);
      return remaining;
    }
    return this.game.currentState.timeLeft || 0;
  }

  calculateEventTimestamp() {
    const periodDurationMs = this.game.duration * 60 * 1000;
    const timeLeftMs = this.calculateTimeLeft();
    const elapsedThisPeriod = Math.max(
      0,
      Math.min(periodDurationMs, periodDurationMs - timeLeftMs),
    );

    // Simple match time calculation (assume GameTimeMode.match logic)
    const completedPeriods = (this.game.currentState.period || 1) - 1;
    return completedPeriods * periodDurationMs + elapsedThisPeriod;
  }

  addEvent({ type, description, team, playerIndex, level = 1 }) {
    if (!this.game.data.gameEvents) this.game.data.gameEvents = [];

    const event = {
      id: "", // Typically generated by Firestore on push, or just empty for now
      timestamp: this.calculateEventTimestamp(),
      description: description,
      type: type,
      team: team,
      playerIndex: playerIndex,
      level: level,
    };

    this.game.data.gameEvents.push(event);
    this.markDirty("data.gameEvents");
  }

  markDirty(key) {
    this.updatedData.add(key);
  }

  /**
   * Returns an object containing only the fields that have changed.
   * Suitable for Firestore update().
   */
  getUpdates() {
    const updates = {};
    for (const path of this.updatedData) {
      // Split path to navigate the object
      const keys = path.split(".");
      let value = this.game;
      for (const key of keys) {
        if (value && Object.prototype.hasOwnProperty.call(value, key)) {
          value = value[key];
        } else {
          value = undefined;
          break;
        }
      }
      if (value !== undefined) {
        updates[path] = value;
      }
    }
    updates.updatedAt = new Date().toISOString();
    return updates;
  }
}

module.exports = GameSystem;
