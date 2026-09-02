/**
 * CSV Export Service
 * Formats daily match summary, top performers, disciplinary cards, and goals into structured CSV.
 */
class CsvService {
  /**
   * Escape a string value for CSV format.
   * @param {*} value
   * @returns {string}
   */
  static escape(value) {
    if (value === null || value === undefined) return '""';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  }

  /**
   * Generates a complete daily summary CSV document with labeled sections.
   * @param {Object} data
   * @returns {string}
   */
  static generateDailySummaryCsv({ date, sport, tournamentName, games = [], performers = [], cards = [], goals = [] }) {
    const lines = [];

    // Header metadata
    lines.push("CATCH ME PLATFORM - OFFICIAL ORGANIZER & SCOUT DAILY REPORT");
    lines.push(`Report Date,${this.escape(date || new Date().toISOString().split("T")[0])}`);
    lines.push(`Sport,${this.escape(sport || "All Sports")}`);
    lines.push(`Tournament,${this.escape(tournamentName || "All Tournaments")}`);
    lines.push(`Generated At,${this.escape(new Date().toISOString())}`);
    lines.push("");

    // Section 1: Top Performers
    lines.push("=== TOP PERFORMERS ===");
    lines.push("Rank,Player Name,Player ID,Team,Sport,Rating,Goals/Points,Assists,Cards,Profile Link");
    if (performers.length === 0) {
      lines.push("No performer records available for this date.");
    } else {
      performers.forEach((p, idx) => {
        lines.push([
          idx + 1,
          this.escape(p.name || "Unknown"),
          this.escape(p.id || p.userId || ""),
          this.escape(p.teamName || p.team || ""),
          this.escape(p.sport || sport || ""),
          p.rating !== undefined ? p.rating : "N/A",
          p.goals !== undefined ? p.goals : p.points || 0,
          p.assists || 0,
          `Y:${p.yellowCards || 0} R:${p.redCards || 0}`,
          this.escape(p.profileUrl || `https://app.catchme.live/profile?id=${p.id || p.userId || ""}`),
        ].join(","));
      });
    }
    lines.push("");

    // Section 2: Disciplinary Log (Yellow & Red Cards)
    lines.push("=== DISCIPLINARY LOG (CARDS) ===");
    lines.push("Card Type,Player Name,Player ID,Team,Game ID,Match,Minute/Time,Reason/Infraction");
    if (cards.length === 0) {
      lines.push("No card infractions recorded for this date.");
    } else {
      cards.forEach((c) => {
        lines.push([
          this.escape(c.cardType || c.type || "Card"),
          this.escape(c.playerName || c.name || "Unknown"),
          this.escape(c.playerId || ""),
          this.escape(c.teamName || c.team || ""),
          this.escape(c.gameId || ""),
          this.escape(c.matchTitle || `${c.homeTeam || "Home"} vs ${c.awayTeam || "Away"}`),
          this.escape(c.minute || c.timestamp || "-"),
          this.escape(c.reason || c.description || "Foul / Infraction"),
        ].join(","));
      });
    }
    lines.push("");

    // Section 3: Goals & Scorers
    lines.push("=== GOALS & SCORERS ===");
    lines.push("Scorer Name,Scorer ID,Team,Game ID,Match,Minute/Time,Assist By,Event Type");
    if (goals.length === 0) {
      lines.push("No goals recorded for this date.");
    } else {
      goals.forEach((g) => {
        lines.push([
          this.escape(g.scorerName || g.playerName || "Unknown"),
          this.escape(g.scorerId || g.playerId || ""),
          this.escape(g.teamName || g.team || ""),
          this.escape(g.gameId || ""),
          this.escape(g.matchTitle || `${g.homeTeam || "Home"} vs ${g.awayTeam || "Away"}`),
          this.escape(g.minute || g.timestamp || "-"),
          this.escape(g.assistName || g.assistPlayerName || "None"),
          this.escape(g.type || "Goal"),
        ].join(","));
      });
    }
    lines.push("");

    // Section 4: Match Verification & Results
    lines.push("=== MATCH RESULTS & VERIFICATION ===");
    lines.push("Game ID,Date,Tournament,Home Team,Home Score,Away Score,Away Team,Status,Verified Status,Game Link");
    if (games.length === 0) {
      lines.push("No matches recorded for this date.");
    } else {
      games.forEach((g) => {
        const homeName = g.data?.homeTeam?.name || "Home Team";
        const awayName = g.data?.awayTeam?.name || "Away Team";
        const homeScore = g.currentState?.homeScore !== undefined ? g.currentState.homeScore : 0;
        const awayScore = g.currentState?.awayScore !== undefined ? g.currentState.awayScore : 0;
        const status = g.currentState?.status || "scheduled";
        const verified = g.verified || g.isVerified ? "Verified" : "Pending";

        lines.push([
          this.escape(g.id || ""),
          this.escape(g.date || g.createdAt || ""),
          this.escape(g.tournamentName || "Regular"),
          this.escape(homeName),
          homeScore,
          awayScore,
          this.escape(awayName),
          this.escape(status),
          this.escape(verified),
          this.escape(`https://app.catchme.live/game?id=${g.id || ""}`),
        ].join(","));
      });
    }

    return lines.join("\r\n");
  }

  /**
   * Generates a CSV strictly containing Top Performers.
   * @param {Array} performers
   * @returns {string}
   */
  static generatePerformersCsv(performers = []) {
    const lines = ["Rank,Player Name,Player ID,Team,Sport,Rating,Goals,Points,Assists,Yellow Cards,Red Cards,Profile URL"];
    performers.forEach((p, idx) => {
      lines.push([
        idx + 1,
        this.escape(p.name || "Unknown"),
        this.escape(p.id || p.userId || ""),
        this.escape(p.teamName || p.team || ""),
        this.escape(p.sport || ""),
        p.rating !== undefined ? p.rating : "",
        p.goals || 0,
        p.points || 0,
        p.assists || 0,
        p.yellowCards || 0,
        p.redCards || 0,
        this.escape(p.profileUrl || `https://app.catchme.live/profile?id=${p.id || p.userId || ""}`),
      ].join(","));
    });
    return lines.join("\r\n");
  }

  /**
   * Generates a CSV strictly containing Cards.
   * @param {Array} cards
   * @returns {string}
   */
  static generateCardsCsv(cards = []) {
    const lines = ["Card Type,Player Name,Player ID,Team,Game ID,Match,Minute,Reason"];
    cards.forEach((c) => {
      lines.push([
        this.escape(c.cardType || c.type || "Card"),
        this.escape(c.playerName || c.name || "Unknown"),
        this.escape(c.playerId || ""),
        this.escape(c.teamName || c.team || ""),
        this.escape(c.gameId || ""),
        this.escape(c.matchTitle || ""),
        this.escape(c.minute || c.timestamp || "-"),
        this.escape(c.reason || c.description || ""),
      ].join(","));
    });
    return lines.join("\r\n");
  }
}

module.exports = { CsvService };
