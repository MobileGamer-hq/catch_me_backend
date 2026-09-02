const scouterService = require('../services/scouter.service');
const pdfService = require('../services/pdf.service');
const { CsvService } = require('../services/csv.service');
const { Firestore } = require('../utils/db');
const { LinkUtils } = require('../services/linkUtilities');

/**
 * Scout & Organizer Controller
 */

/**
 * Renders tablet-friendly responsive HTML Scout & Organizer Web View
 * GET /api/scout/view OR GET /api/organizer/view
 */
const getScoutDashboardView = async (req, res) => {
  try {
    const { date, tournamentId, sport } = req.query;
    const summaryData = await scouterService.getDailySummaryData({ date, tournamentId, sport });

    const selectedDate = summaryData.date;
    const selectedSport = summaryData.sport;
    const kpis = summaryData.kpis;
    const performers = summaryData.performers;
    const cards = summaryData.cards;
    const goals = summaryData.goals;
    const games = summaryData.games;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Catch Me — Scout & Organizer Official Verification Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #F8FAFC; }
    .brand-purple { color: #5352ED; }
    .bg-brand-purple { background-color: #5352ED; }
    .bg-brand-purple:hover { background-color: #4341E8; }
    .border-brand-purple { border-color: #5352ED; }
    .active-tab { border-bottom: 3px solid #5352ED; color: #5352ED; font-weight: 700; }
    .tab-btn { transition: all 0.15s ease-in-out; }
    .kpi-card { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03); }
  </style>
</head>
<body class="text-slate-800 antialiased min-h-screen flex flex-col">

  <!-- Top Navigation Bar -->
  <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center space-x-3">
        <a href="/api/scout/view" class="flex items-center space-x-2">
          <span class="text-2xl font-extrabold tracking-tight">
            <span class="text-[#5352ED]">Catch</span> <span class="text-black">Me</span>
          </span>
          <span class="ml-2 px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 uppercase tracking-wider">Scout & Organizer</span>
        </a>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center flex-wrap gap-2.5">
        <a href="/api/scout/daily-summary/pdf?date=${encodeURIComponent(selectedDate)}&sport=${encodeURIComponent(selectedSport !== 'All Sports' ? selectedSport : '')}"
           target="_blank"
           class="inline-flex items-center px-3.5 py-2 text-sm font-semibold text-white bg-[#5352ED] hover:bg-[#4341E8] rounded-lg shadow-sm transition-colors">
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Export Day PDF
        </a>
        <a href="/api/scout/daily-summary/csv?date=${encodeURIComponent(selectedDate)}&sport=${encodeURIComponent(selectedSport !== 'All Sports' ? selectedSport : '')}"
           target="_blank"
           class="inline-flex items-center px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-colors">
          <svg class="w-4 h-4 mr-1.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Export CSV
        </a>
      </div>
    </div>
  </header>

  <!-- Filter & Controls Toolbar -->
  <section class="bg-white border-b border-slate-200 py-3">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <form method="GET" action="/api/scout/view" class="flex flex-wrap items-center gap-3">
        <div class="flex items-center space-x-2">
          <label for="date-input" class="text-xs font-bold text-slate-500 uppercase tracking-wide">Date</label>
          <input type="date" id="date-input" name="date" value="${selectedDate}"
                 onchange="this.form.submit()"
                 class="px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700">
        </div>

        <div class="flex items-center space-x-2">
          <label for="sport-input" class="text-xs font-bold text-slate-500 uppercase tracking-wide">Sport</label>
          <select id="sport-input" name="sport" onchange="this.form.submit()"
                  class="px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700">
            <option value="" ${!sport ? 'selected' : ''}>All Sports</option>
            <option value="Football" ${sport === 'Football' ? 'selected' : ''}>Football (Soccer)</option>
            <option value="Basketball" ${sport === 'Basketball' ? 'selected' : ''}>Basketball</option>
            <option value="Volleyball" ${sport === 'Volleyball' ? 'selected' : ''}>Volleyball</option>
            <option value="Track" ${sport === 'Track' ? 'selected' : ''}>Track & Field</option>
          </select>
        </div>

        <button type="submit" class="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors">
          Refresh View
        </button>
      </form>
    </div>
  </section>

  <!-- Main Content Container -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">

    <!-- KPI Summary Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-xl border border-slate-200 kpi-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Matches</span>
          <span class="p-1.5 bg-indigo-50 text-[#5352ED] rounded-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-slate-900">${kpis.totalGames}</span>
          <span class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Active</span>
        </div>
      </div>

      <div class="bg-white p-4 rounded-xl border border-slate-200 kpi-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Goals / Scores</span>
          <span class="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
          </span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-slate-900">${kpis.totalGoals}</span>
          <span class="text-xs text-slate-500 font-medium">Recorded</span>
        </div>
      </div>

      <div class="bg-white p-4 rounded-xl border border-slate-200 kpi-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Yellow Cards</span>
          <span class="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><rect width="14" height="18" x="3" y="1" rx="2"></rect></svg>
          </span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-amber-600">${kpis.totalYellowCards}</span>
          <span class="text-xs text-slate-500 font-medium">Warnings</span>
        </div>
      </div>

      <div class="bg-white p-4 rounded-xl border border-slate-200 kpi-card">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Red Cards</span>
          <span class="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><rect width="14" height="18" x="3" y="1" rx="2"></rect></svg>
          </span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-rose-600">${kpis.totalRedCards}</span>
          <span class="text-xs text-rose-600 font-medium">Disciplinary</span>
        </div>
      </div>
    </div>

    <!-- Tabbed Navigation -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="border-b border-slate-200 px-4 sm:px-6 flex space-x-6 overflow-x-auto">
        <button onclick="switchTab('performers')" id="tab-performers" class="tab-btn py-3.5 text-sm font-semibold active-tab whitespace-nowrap">
          Top Performers (${performers.length})
        </button>
        <button onclick="switchTab('cards')" id="tab-cards" class="tab-btn py-3.5 text-sm font-semibold text-slate-500 hover:text-slate-700 whitespace-nowrap">
          Disciplinary Log / Cards (${cards.length})
        </button>
        <button onclick="switchTab('goals')" id="tab-goals" class="tab-btn py-3.5 text-sm font-semibold text-slate-500 hover:text-slate-700 whitespace-nowrap">
          Goals & Scorers (${goals.length})
        </button>
        <button onclick="switchTab('matches')" id="tab-matches" class="tab-btn py-3.5 text-sm font-semibold text-slate-500 hover:text-slate-700 whitespace-nowrap">
          Matches & Official Verification (${games.length})
        </button>
      </div>

      <div class="p-4 sm:p-6">

        <!-- TAB 1: Top Performers -->
        <div id="content-performers" class="tab-content block">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-base font-bold text-slate-900">Day's Top Performers & Scout Watchlist</h2>
              <p class="text-xs text-slate-500">Calculated ratings, performance points, and scout sheet exports.</p>
            </div>
            <span class="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
              ${performers.length} Athletes Ranked
            </span>
          </div>

          ${performers.length === 0 ? `
            <div class="py-12 text-center text-slate-400">
              <svg class="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              <p class="mt-2 text-sm font-medium">No player performance data recorded for this date.</p>
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Athlete</th>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Team</th>
                    <th class="px-3.5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Rating</th>
                    <th class="px-3.5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Goals/Pts</th>
                    <th class="px-3.5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Ast</th>
                    <th class="px-3.5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Cards</th>
                    <th class="px-3.5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Scout Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-slate-100">
                  ${performers.map((p, idx) => `
                    <tr class="hover:bg-slate-50 transition-colors">
                      <td class="px-3.5 py-3 text-sm font-extrabold text-slate-400">#${idx + 1}</td>
                      <td class="px-3.5 py-3">
                        <div class="text-sm font-bold text-slate-900">${p.name}</div>
                        <div class="text-xs text-slate-400 font-mono">${p.id}</div>
                      </td>
                      <td class="px-3.5 py-3 text-sm font-medium text-slate-600">${p.teamName}</td>
                      <td class="px-3.5 py-3 text-center">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                          ★ ${p.rating}
                        </span>
                      </td>
                      <td class="px-3.5 py-3 text-sm text-center font-bold text-slate-900">${p.goals || p.points || 0}</td>
                      <td class="px-3.5 py-3 text-sm text-center font-medium text-slate-600">${p.assists || 0}</td>
                      <td class="px-3.5 py-3 text-xs text-center font-medium">
                        <span class="text-amber-600 font-bold">Y:${p.yellowCards || 0}</span>
                        <span class="text-rose-600 font-bold ml-1">R:${p.redCards || 0}</span>
                      </td>
                      <td class="px-3.5 py-3 text-right space-x-1.5">
                        <a href="/api/scout/profile/${encodeURIComponent(p.id)}/pdf" target="_blank"
                           class="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors" title="Download Official Scout Dossier">
                          📄 Scout PDF
                        </a>
                        <button onclick="openQrModal('profile', '${p.id}', '${p.name}')"
                                class="inline-flex items-center px-2 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors" title="View Mobile QR Code">
                          📱 QR
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- TAB 2: Disciplinary Log (Cards) -->
        <div id="content-cards" class="tab-content hidden">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-base font-bold text-slate-900">Official Disciplinary Record & Cards</h2>
              <p class="text-xs text-slate-500">Yellow and Red card infractions for referee review and official match verification.</p>
            </div>
            <span class="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded-md">
              ${cards.length} Infractions Logged
            </span>
          </div>

          ${cards.length === 0 ? `
            <div class="py-12 text-center text-slate-400">
              <p class="text-sm font-medium">No card infractions issued during this period. Clean sheet!</p>
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Card</th>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Player Name</th>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Team</th>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Match</th>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Infraction Reason</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-slate-100">
                  ${cards.map((c) => {
                    const isRed = c.cardType === 'Red Card';
                    return `
                      <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-3.5 py-3 whitespace-nowrap">
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${isRed ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">
                            ${isRed ? '🟥 RED CARD' : '🟨 YELLOW CARD'}
                          </span>
                        </td>
                        <td class="px-3.5 py-3 text-xs font-bold text-slate-500">${c.minute}</td>
                        <td class="px-3.5 py-3 text-sm font-bold text-slate-900">${c.playerName}</td>
                        <td class="px-3.5 py-3 text-sm font-medium text-slate-600">${c.teamName}</td>
                        <td class="px-3.5 py-3 text-xs font-medium text-slate-500">${c.matchTitle}</td>
                        <td class="px-3.5 py-3 text-xs text-slate-700">${c.reason}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- TAB 3: Goals & Timeline -->
        <div id="content-goals" class="tab-content hidden">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-base font-bold text-slate-900">Goals & Scoring Events</h2>
              <p class="text-xs text-slate-500">Chronological goal timeline across all matches.</p>
            </div>
            <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
              ${goals.length} Goals Recorded
            </span>
          </div>

          ${goals.length === 0 ? `
            <div class="py-12 text-center text-slate-400">
              <p class="text-sm font-medium">No goals recorded for this date.</p>
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Scorer</th>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Team</th>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Match</th>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Assist</th>
                    <th class="px-3.5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Event Type</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-slate-100">
                  ${goals.map((g) => `
                    <tr class="hover:bg-slate-50 transition-colors">
                      <td class="px-3.5 py-3 text-xs font-extrabold text-indigo-600">${g.minute}</td>
                      <td class="px-3.5 py-3 text-sm font-bold text-slate-900">⚽ ${g.scorerName}</td>
                      <td class="px-3.5 py-3 text-sm font-medium text-slate-600">${g.teamName}</td>
                      <td class="px-3.5 py-3 text-xs font-medium text-slate-500">${g.matchTitle}</td>
                      <td class="px-3.5 py-3 text-xs font-medium text-slate-600">${g.assistName}</td>
                      <td class="px-3.5 py-3 text-xs text-slate-500">${g.type}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- TAB 4: Matches & Verification -->
        <div id="content-matches" class="tab-content hidden">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-base font-bold text-slate-900">Match Results & Official Verification Sheets</h2>
              <p class="text-xs text-slate-500">Download individual official match reports with QR verification codes.</p>
            </div>
          </div>

          ${games.length === 0 ? `
            <div class="py-12 text-center text-slate-400">
              <p class="text-sm font-medium">No matches scheduled or recorded for this date.</p>
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${games.map((g) => {
                const home = g.data?.homeTeam?.name || 'Home Team';
                const away = g.data?.awayTeam?.name || 'Away Team';
                const hs = g.currentState?.homeScore !== undefined ? g.currentState.homeScore : 0;
                const as = g.currentState?.awayScore !== undefined ? g.currentState.awayScore : 0;
                const status = g.currentState?.status || 'completed';

                return `
                  <div class="bg-white border border-slate-200 rounded-xl p-4.5 hover:border-indigo-300 transition-colors shadow-xs">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">${g.sport || 'Match'} • ${g.tournamentName || 'Standard'}</span>
                      <span class="px-2 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-md uppercase">
                        ${status}
                      </span>
                    </div>

                    <div class="my-3 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div class="text-sm font-bold text-slate-800 text-left flex-1">${home}</div>
                      <div class="px-3 py-1 bg-white rounded-md border border-slate-200 text-base font-extrabold text-[#5352ED] mx-2">
                        ${hs} - ${as}
                      </div>
                      <div class="text-sm font-bold text-slate-800 text-right flex-1">${away}</div>
                    </div>

                    <div class="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div class="text-xs text-slate-500">
                        📍 ${g.location || 'Arena'}
                      </div>
                      <div class="flex items-center space-x-2">
                        <a href="/api/games/${encodeURIComponent(g.id)}/download" target="_blank"
                           class="px-2.5 py-1 text-xs font-semibold text-white bg-[#5352ED] hover:bg-[#4341E8] rounded shadow-xs transition-colors">
                          📄 Match PDF
                        </a>
                        <button onclick="openQrModal('game', '${g.id}', '${home} vs ${away}')"
                                class="px-2 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors">
                          📱 QR
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

      </div>
    </div>

  </main>

  <!-- QR Code Modal (Tablet Friendly) -->
  <div id="qr-modal" class="fixed inset-0 bg-slate-900/60 z-50 hidden items-center justify-center p-4 backdrop-blur-xs">
    <div class="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl border border-slate-100 animate-in fade-in zoom-in duration-150">
      <h3 id="qr-modal-title" class="text-base font-bold text-slate-900 mb-1">Entity QR Code</h3>
      <p id="qr-modal-subtitle" class="text-xs text-slate-500 mb-4">Scan with phone camera to open in Catch Me App</p>

      <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block mb-4">
        <img id="qr-modal-img" src="" alt="QR Code" class="w-48 h-48 mx-auto rounded-lg">
      </div>

      <div class="text-xs text-slate-400 font-mono break-all mb-4" id="qr-modal-link"></div>

      <div class="flex items-center justify-center space-x-2">
        <a id="qr-modal-download" href="" download="catchme_qr.png"
           class="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors">
          Download PNG
        </a>
        <button onclick="closeQrModal()"
                class="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
          Close
        </button>
      </div>
    </div>
  </div>

  <script>
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active-tab');
        btn.classList.add('text-slate-500');
      });
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('block');
      });

      const selectedTab = document.getElementById('tab-' + tabId);
      const selectedContent = document.getElementById('content-' + tabId);

      if (selectedTab) {
        selectedTab.classList.add('active-tab');
        selectedTab.classList.remove('text-slate-500');
      }
      if (selectedContent) {
        selectedContent.classList.remove('hidden');
        selectedContent.classList.add('block');
      }
    }

    function openQrModal(type, id, title) {
      const modal = document.getElementById('qr-modal');
      const img = document.getElementById('qr-modal-img');
      const titleEl = document.getElementById('qr-modal-title');
      const linkEl = document.getElementById('qr-modal-link');
      const downloadBtn = document.getElementById('qr-modal-download');

      const qrUrl = '/api/qr/' + type + '/' + encodeURIComponent(id);
      let targetLink = 'https://app.catchme.live/' + type + '?id=' + encodeURIComponent(id);

      titleEl.innerText = title || (type.toUpperCase() + ' QR Code');
      img.src = qrUrl;
      linkEl.innerText = targetLink;
      downloadBtn.href = qrUrl;

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeQrModal() {
      const modal = document.getElementById('qr-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  </script>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error rendering scout dashboard:', error);
    return res.status(500).json({ status: 'FAILED', error: 'Failed to render scout dashboard', details: error.message });
  }
};

/**
 * Daily Summary JSON API
 * GET /api/scout/daily-summary
 */
const getDailySummary = async (req, res) => {
  try {
    const { date, tournamentId, sport } = req.query;
    const summaryData = await scouterService.getDailySummaryData({ date, tournamentId, sport });
    return res.status(200).json({ status: 'SUCCESS', ...summaryData });
  } catch (error) {
    console.error('Daily Summary API Error:', error);
    return res.status(500).json({ status: 'FAILED', error: 'Failed to fetch daily summary', details: error.message });
  }
};

/**
 * Export Daily Summary PDF
 * GET /api/scout/daily-summary/pdf OR GET /api/organizer/daily-summary/pdf
 */
const exportDailySummaryPdf = async (req, res) => {
  try {
    const { date, tournamentId, sport } = req.query;
    const summaryData = await scouterService.getDailySummaryData({ date, tournamentId, sport });
    const pdfBuffer = await pdfService.generateDailySummaryPdf(summaryData);

    const safeDate = summaryData.date || new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=catchme_daily_summary_${safeDate}.pdf`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Error generating daily summary PDF:', error);
    return res.status(500).json({ status: 'FAILED', error: 'Failed to export daily summary PDF', details: error.message });
  }
};

/**
 * Export Daily Summary CSV
 * GET /api/scout/daily-summary/csv OR GET /api/organizer/daily-summary/csv
 */
const exportDailySummaryCsv = async (req, res) => {
  try {
    const { date, tournamentId, sport, type } = req.query;
    const summaryData = await scouterService.getDailySummaryData({ date, tournamentId, sport });

    let csvContent = '';
    let fileName = `catchme_daily_summary_${summaryData.date || 'report'}.csv`;

    if (type === 'performers') {
      csvContent = CsvService.generatePerformersCsv(summaryData.performers);
      fileName = `catchme_top_performers_${summaryData.date || 'report'}.csv`;
    } else if (type === 'cards') {
      csvContent = CsvService.generateCardsCsv(summaryData.cards);
      fileName = `catchme_cards_summary_${summaryData.date || 'report'}.csv`;
    } else {
      csvContent = CsvService.generateDailySummaryCsv(summaryData);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error generating daily summary CSV:', error);
    return res.status(500).json({ status: 'FAILED', error: 'Failed to export daily summary CSV', details: error.message });
  }
};

/**
 * Export Athlete Scouting Dossier PDF
 * GET /api/scout/profile/:id/pdf OR GET /api/users/:id/download
 */
const exportAthleteProfilePdf = async (req, res) => {
  try {
    const userId = req.params.id || req.params.userId;
    const user = await scouterService.getAthleteProfile(userId);

    if (!user) {
      return res.status(404).json({ status: 'FAILED', error: 'Athlete profile not found' });
    }

    const pdfBuffer = await pdfService.generateAthleteProfilePdf(user);

    const safeUsername = (user.username || user.name || userId).replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=scout_profile_${safeUsername}.pdf`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Error generating athlete profile PDF:', error);
    return res.status(error.message.includes('not found') ? 404 : 500).json({ status: 'FAILED', error: 'Failed to export athlete profile PDF', details: error.message });
  }
};

module.exports = {
  getScoutDashboardView,
  getDailySummary,
  exportDailySummaryPdf,
  exportDailySummaryCsv,
  exportAthleteProfilePdf,
};
