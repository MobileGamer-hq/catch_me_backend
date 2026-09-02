const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 1. Test LinkUtils
const { LinkUtils } = require('../src/services/linkUtilities');
console.log('Testing LinkUtils...');

assert.strictEqual(LinkUtils.generateProfileLink('user123'), 'https://app.catchme.live/profile?id=user123');
assert.strictEqual(LinkUtils.generatePostLink('post456'), 'https://app.catchme.live/post?id=post456');
assert.strictEqual(LinkUtils.generateChallengeLink('event789'), 'https://app.catchme.live/challenge?id=event789');
assert.strictEqual(LinkUtils.generateGameLink('game999'), 'https://app.catchme.live/game?id=game999');
assert.strictEqual(LinkUtils.generateLineupLink('game999'), 'https://app.catchme.live/game?id=game999&tab=lineup');
assert.strictEqual(LinkUtils.generateStatsLink('game999'), 'https://app.catchme.live/game?id=game999&tab=stats');

// Test getIdFromLink
assert.strictEqual(LinkUtils.getIdFromLink('https://app.catchme.live/profile?id=user123'), 'user123');
assert.strictEqual(LinkUtils.getIdFromLink('https://app.catchme.live/#/game?id=game999'), 'game999');
assert.strictEqual(LinkUtils.getIdFromLink('https://app.catchme.live/game?id=game999&tab=lineup'), 'game999');
assert.strictEqual(LinkUtils.getIdFromLink('invalid-url-without-id'), null);

// Test getLinkType
assert.strictEqual(LinkUtils.getLinkType('https://app.catchme.live/game?id=123'), 'game');
assert.strictEqual(LinkUtils.getLinkType('https://app.catchme.live/post?id=123'), 'post');
assert.strictEqual(LinkUtils.getLinkType('https://app.catchme.live/challenge?id=123'), 'challenge');
assert.strictEqual(LinkUtils.getLinkType('https://app.catchme.live/profile?id=123'), 'profile');
console.log('✓ LinkUtils tests passed.');

// 2. Test QrService
const { QrService } = require('../src/services/qr.service');

async function testQrService() {
  console.log('Testing QrService...');
  const pngBuffer = await QrService.generatePngBuffer('https://app.catchme.live/game?id=game123');
  assert(Buffer.isBuffer(pngBuffer), 'QR PNG should be a Buffer');
  assert(pngBuffer.length > 0, 'QR PNG Buffer should not be empty');

  const dataUrl = await QrService.generateDataUrl('https://app.catchme.live/profile?id=user123');
  assert(typeof dataUrl === 'string', 'QR DataURL should be a string');
  assert(dataUrl.startsWith('data:image/png;base64,'), 'QR DataURL should start with prefix');

  const entity = await QrService.generateEntityQr('profile', 'user456');
  assert.strictEqual(entity.link, 'https://app.catchme.live/profile?id=user456');
  assert(Buffer.isBuffer(entity.buffer));
  console.log('✓ QrService tests passed.');
}

// 3. Test CsvService
const { CsvService } = require('../src/services/csv.service');
function testCsvService() {
  console.log('Testing CsvService...');
  const sampleSummary = {
    date: '2026-09-02',
    sport: 'Football',
    tournamentName: "Chancellor's Cup",
    games: [
      {
        id: 'game-001',
        date: '2026-09-02',
        data: { homeTeam: { name: 'Eagles FC' }, awayTeam: { name: 'Lions SC' } },
        currentState: { homeScore: 2, awayScore: 1, status: 'completed' },
      }
    ],
    performers: [
      { id: 'player-1', name: 'John Doe', teamName: 'Eagles FC', rating: 9.2, goals: 2, assists: 1, yellowCards: 0, redCards: 0 }
    ],
    cards: [
      { cardType: 'Yellow Card', playerName: 'Alex Smith', teamName: 'Lions SC', minute: "42'", reason: 'Tactical Foul' }
    ],
    goals: [
      { scorerName: 'John Doe', teamName: 'Eagles FC', minute: "14'", assistName: 'Sam Kerr', type: 'Header' }
    ]
  };

  const csv = CsvService.generateDailySummaryCsv(sampleSummary);
  assert(csv.includes('CATCH ME PLATFORM'), 'CSV should have Catch Me header');
  assert(csv.includes('John Doe'), 'CSV should include player');
  assert(csv.includes('Tactical Foul'), 'CSV should include card reason');
  console.log('✓ CsvService tests passed.');
}

// 4. Test PDF Generation
const pdfService = require('../src/services/pdf.service');
async function testPdfService() {
  console.log('Testing PDF Generation...');

  const sampleGame = {
    id: 'game-sample-123',
    title: 'Eagles FC vs Lions SC - Championship Final',
    sport: 'Football',
    date: '2026-09-02T15:00:00Z',
    location: 'National Stadium, Main Pitch',
    tournamentName: 'Catch Me National Cup',
    currentState: {
      homeScore: 3,
      awayScore: 1,
      status: 'completed',
    },
    data: {
      homeTeam: {
        name: 'Eagles FC',
        players: [
          { number: 10, name: 'Marcus Sterling', position: 'FW', stats: { Pts: 2, Ast: 1, yellowCards: 0, redCards: 0 }, rating: 9.4 },
          { number: 7, name: 'David Vance', position: 'MF', stats: { Pts: 1, Ast: 1, yellowCards: 1, redCards: 0 }, rating: 8.5 },
        ]
      },
      awayTeam: {
        name: 'Lions SC',
        players: [
          { number: 9, name: 'Victor Gomez', position: 'FW', stats: { Pts: 1, Ast: 0, yellowCards: 0, redCards: 1 }, rating: 7.0 },
        ]
      },
      gameEvents: [
        { timestamp: "12'", type: 'Goal', team: 'Eagles FC', playerName: 'Marcus Sterling', assistPlayerName: 'David Vance' },
        { timestamp: "34'", type: 'Yellow Card', team: 'Eagles FC', playerName: 'David Vance', reason: 'Unsporting Behavior' },
        { timestamp: "58'", type: 'Goal', team: 'Lions SC', playerName: 'Victor Gomez', assistPlayerName: 'None' },
        { timestamp: "77'", type: 'Red Card', team: 'Lions SC', playerName: 'Victor Gomez', reason: 'Serious Foul Play' },
        { timestamp: "89'", type: 'Goal', team: 'Eagles FC', playerName: 'David Vance', assistPlayerName: 'Marcus Sterling' },
      ]
    }
  };

  const gamePdfBuffer = await pdfService.generateGamePdf(sampleGame);
  assert(Buffer.isBuffer(gamePdfBuffer));
  assert(gamePdfBuffer.length > 5000, 'Game PDF should have substantial size');
  fs.writeFileSync('scratch/sample_game_report.pdf', gamePdfBuffer);
  console.log('✓ Generated scratch/sample_game_report.pdf (' + gamePdfBuffer.length + ' bytes)');

  const sampleUser = {
    id: 'user-athlete-777',
    name: 'Marcus Sterling',
    username: 'msterling10',
    gender: 'Male',
    age: 19,
    dob: '2007-04-12',
    country: 'United Kingdom',
    location: 'London',
    bio: 'Dynamic attacking winger with exceptional pace, vision, and dead-ball accuracy. Multi-time tournament MVP.',
    verified: true,
    level: 14,
    xp: 14200,
    nextLevelXP: 18000,
    height: { value: 182, unit: 'cm' },
    weight: { value: 76, unit: 'kg' },
    interestedSports: ['Football', 'Track'],
    contact: {
      email: 'msterling@catchme.live',
      phone: '+44 7700 900077',
      instagram: '@msterling10',
      x: '@msterling10',
      tiktok: '@msterling10'
    },
    stats: [
      { label: 'Matches Played', value: 38 },
      { label: 'Goals Scored', value: 29 },
      { label: 'Assists', value: 18 },
      { label: 'Shots on Target', value: '78%' },
      { label: 'Scout Rating', value: '9.4 / 10' }
    ],
    achievements: [
      { title: 'Golden Boot Winner 2026' },
      { title: 'Catch Me National MVP' },
      { title: 'Fastest 40m Sprint Record (4.38s)' }
    ]
  };

  const athletePdfBuffer = await pdfService.generateAthleteProfilePdf(sampleUser);
  assert(Buffer.isBuffer(athletePdfBuffer));
  assert(athletePdfBuffer.length > 5000, 'Athlete PDF should have substantial size');
  fs.writeFileSync('scratch/sample_athlete_scout_report.pdf', athletePdfBuffer);
  console.log('✓ Generated scratch/sample_athlete_scout_report.pdf (' + athletePdfBuffer.length + ' bytes)');

  const sampleDailySummary = {
    date: '2026-09-02',
    sport: 'Football',
    tournamentName: 'Catch Me Summer Championship',
    games: [sampleGame],
    performers: [
      { id: 'user-athlete-777', name: 'Marcus Sterling', teamName: 'Eagles FC', rating: 9.4, goals: 2, assists: 1, yellowCards: 0, redCards: 0 },
      { id: 'user-athlete-888', name: 'David Vance', teamName: 'Eagles FC', rating: 8.5, goals: 1, assists: 1, yellowCards: 1, redCards: 0 },
      { id: 'user-athlete-999', name: 'Victor Gomez', teamName: 'Lions SC', rating: 7.0, goals: 1, assists: 0, yellowCards: 0, redCards: 1 }
    ],
    cards: [
      { cardType: 'Yellow Card', playerName: 'David Vance', teamName: 'Eagles FC', matchTitle: 'Eagles vs Lions', minute: "34'", reason: 'Unsporting Behavior' },
      { cardType: 'Red Card', playerName: 'Victor Gomez', teamName: 'Lions SC', matchTitle: 'Eagles vs Lions', minute: "77'", reason: 'Serious Foul Play' }
    ],
    goals: [
      { scorerName: 'Marcus Sterling', teamName: 'Eagles FC', matchTitle: 'Eagles vs Lions', minute: "12'", assistName: 'David Vance', type: 'Goal' },
      { scorerName: 'Victor Gomez', teamName: 'Lions SC', matchTitle: 'Eagles vs Lions', minute: "58'", assistName: 'None', type: 'Goal' },
      { scorerName: 'David Vance', teamName: 'Eagles FC', matchTitle: 'Eagles vs Lions', minute: "89'", assistName: 'Marcus Sterling', type: 'Goal' }
    ]
  };

  const dailyPdfBuffer = await pdfService.generateDailySummaryPdf(sampleDailySummary);
  assert(Buffer.isBuffer(dailyPdfBuffer));
  assert(dailyPdfBuffer.length > 5000, 'Daily PDF should have substantial size');
  fs.writeFileSync('scratch/sample_daily_organizer_summary.pdf', dailyPdfBuffer);
  console.log('✓ Generated scratch/sample_daily_organizer_summary.pdf (' + dailyPdfBuffer.length + ' bytes)');
}

async function runAll() {
  await testQrService();
  testCsvService();
  await testPdfService();
  console.log('\n=== ALL EXPORT AND QR TESTS COMPLETED SUCCESSFULLY ===');
}

runAll().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
