const fs = require('fs');
const path = require('path');
const { db } = require('../config/firebase');
const { Firestore } = require('../utils/db');

/**
 * Scouter & Organizer Data Aggregation Service
 */
class ScouterService {
  /**
   * Retrieves and aggregates summary data for a given day/tournament/sport.
   * @param {Object} params - { date, tournamentId, tournamentName, sport }
   * @returns {Promise<Object>}
   */
  async getDailySummaryData({ date, tournamentId, tournamentName, sport } = {}) {
    try {
      let allGames = [];

      try {
        let query = db.collection('events').where('type', '==', 'game');

        if (tournamentId) {
          query = query.where('tournamentId', '==', tournamentId);
        }

        if (sport) {
          query = query.where('sport', '==', sport);
        }

        const snapshot = await Promise.race([
          query.get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000)),
        ]);
        allGames = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (dbErr) {
        // Fallback to minified local data if Firestore is unreachable or in tests
        try {
          const gamesMinPath = path.join(__dirname, '../data/games_min.json');
          if (fs.existsSync(gamesMinPath)) {
            const raw = JSON.parse(fs.readFileSync(gamesMinPath, 'utf8'));
            allGames = Object.entries(raw).map(([id, g]) => ({ id, ...g }));
            if (sport) {
              allGames = allGames.filter((g) => (g.sport || '').toLowerCase() === sport.toLowerCase());
            }
          }
        } catch (localErr) {
          allGames = [];
        }
      }

      // If specific date is requested, filter by date string (e.g. YYYY-MM-DD)
      if (date) {
        const targetDateStr = date.split('T')[0];
        allGames = allGames.filter((g) => {
          const gDate = g.date || g.createdAt || g.data?.date || '';
          return gDate.startsWith(targetDateStr);
        });
      }

      // Aggregate data
      const performersMap = {};
      const cards = [];
      const goals = [];

      allGames.forEach((game) => {
        const gameId = game.id;
        const homeName = game.data?.homeTeam?.name || 'Home Team';
        const awayName = game.data?.awayTeam?.name || 'Away Team';
        const matchTitle = game.title || `${homeName} vs ${awayName}`;
        const gameSport = game.sport || sport || 'Football';

        // 1. Process Home & Away Team Players
        const homePlayers = game.data?.homeTeam?.players || [];
        const awayPlayers = game.data?.awayTeam?.players || [];

        const processPlayer = (p, teamName) => {
          const playerId = p.id || p.userId || p.name;
          if (!playerId) return;

          if (!performersMap[playerId]) {
            performersMap[playerId] = {
              id: playerId,
              name: p.name || 'Unknown Athlete',
              teamName,
              sport: gameSport,
              goals: 0,
              points: 0,
              assists: 0,
              yellowCards: 0,
              redCards: 0,
              rating: 6.0,
              matchesPlayed: 0,
            };
          }

          const record = performersMap[playerId];
          record.matchesPlayed++;
          const stats = p.stats || {};
          record.goals += parseInt(stats.goals || stats.Pts || 0, 10);
          record.points += parseInt(stats.points || stats.Pts || 0, 10);
          record.assists += parseInt(stats.Ast || stats.assists || 0, 10);
          record.yellowCards += parseInt(stats.yellowCards || 0, 10);
          record.redCards += parseInt(stats.redCards || 0, 10);
          if (p.rating) {
            record.rating = Math.max(record.rating, parseFloat(p.rating));
          }
        };

        homePlayers.forEach((p) => processPlayer(p, homeName));
        awayPlayers.forEach((p) => processPlayer(p, awayName));

        // 2. Process Game Events (Goals, Cards, Substitutions)
        const events = game.data?.gameEvents || [];
        events.forEach((ev) => {
          const type = (ev.type || ev.description || '').toLowerCase();
          const teamName = ev.team || ev.teamName || (ev.teamId === game.data?.homeTeam?.id ? homeName : awayName);

          // Goals
          if (type.includes('goal') || type.includes('score')) {
            goals.push({
              gameId,
              matchTitle,
              teamName,
              scorerName: ev.playerName || ev.scorerName || 'Player',
              scorerId: ev.playerId || '',
              assistName: ev.assistPlayerName || ev.assist || 'None',
              minute: ev.timestamp || ev.minute || '-',
              type: ev.type || 'Goal',
            });

            // Update performer map
            if (ev.playerId && performersMap[ev.playerId]) {
              performersMap[ev.playerId].goals++;
              performersMap[ev.playerId].rating = Math.min(10, performersMap[ev.playerId].rating + 1.5);
            }
          }

          // Cards
          if (type.includes('yellow') || type.includes('red') || type.includes('card')) {
            const isRed = type.includes('red');
            cards.push({
              gameId,
              matchTitle,
              teamName,
              cardType: isRed ? 'Red Card' : 'Yellow Card',
              playerName: ev.playerName || ev.name || 'Player',
              playerId: ev.playerId || '',
              minute: ev.timestamp || ev.minute || '-',
              reason: ev.reason || ev.description || 'Infraction',
            });

            // Update performer map
            if (ev.playerId && performersMap[ev.playerId]) {
              if (isRed) {
                performersMap[ev.playerId].redCards++;
                performersMap[ev.playerId].rating = Math.max(1, performersMap[ev.playerId].rating - 2.0);
              } else {
                performersMap[ev.playerId].yellowCards++;
                performersMap[ev.playerId].rating = Math.max(1, performersMap[ev.playerId].rating - 0.5);
              }
            }
          }
        });
      });

      // Sort performers by rating and goals
      const performers = Object.values(performersMap)
        .sort((a, b) => (b.rating - a.rating) || (b.goals - a.goals) || (b.assists - a.assists))
        .map((p) => ({
          ...p,
          rating: Math.round(p.rating * 10) / 10,
          profileUrl: `https://app.catchme.live/profile?id=${p.id}`,
        }));

      return {
        date: date || new Date().toISOString().split('T')[0],
        sport: sport || 'All Sports',
        tournamentName: tournamentName || 'All Tournaments',
        kpis: {
          totalGames: allGames.length,
          totalGoals: goals.length,
          totalYellowCards: cards.filter((c) => c.cardType === 'Yellow Card').length,
          totalRedCards: cards.filter((c) => c.cardType === 'Red Card').length,
          totalPerformers: performers.length,
        },
        games: allGames,
        performers,
        cards,
        goals,
      };
    } catch (error) {
      console.error('ScouterService Error:', error);
      throw error;
    }
  }

  /**
   * Retrieves full profile data for an athlete for scout report generation.
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getAthleteProfile(userId) {
    let user = null;
    try {
      user = await Firestore.getById('users', userId);
    } catch (e) {
      console.warn('Firestore getById failed, attempting local fallback:', e.message);
    }

    if (!user) {
      try {
        const userJsonPath = path.join(__dirname, '../../user.json');
        if (fs.existsSync(userJsonPath)) {
          const u = JSON.parse(fs.readFileSync(userJsonPath, 'utf8'));
          if (u.id === userId || u.username === userId || !userId) {
            user = u;
          }
        }
      } catch (err) {}
    }

    if (!user) {
      throw new Error(`Athlete profile not found for ID: ${userId}`);
    }
    return user;
  }
}

module.exports = new ScouterService();
