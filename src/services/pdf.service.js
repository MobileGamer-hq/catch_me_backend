const fs = require('fs');
const path = require('path');
const pdfmake = require('pdfmake');
const { QrService } = require('./qr.service');
const { LinkUtils } = require('./linkUtilities');

// Configure pdfmake built-in standard 14 fonts
pdfmake.setFonts({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
});
pdfmake.setUrlAccessPolicy(() => true);
pdfmake.setLocalAccessPolicy(() => true);

/**
 * Helper to get the Catch Me Logo as Base64 Data URL
 */
const getLogoDataUrl = () => {
  try {
    const logoPath = path.join(__dirname, '../../assets/catch_me_logo.png');
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
  } catch (e) {
    console.warn('PDFService: Unable to load logo image:', e.message);
  }
  return null;
};

/**
 * Common PDF Styles
 */
const commonStyles = {
  headerTitle: {
    fontSize: 16,
    bold: true,
    color: '#1E1B4B',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    margin: [0, 2, 0, 0],
  },
  sectionTitle: {
    fontSize: 12,
    bold: true,
    color: '#4338CA',
    margin: [0, 12, 0, 6],
  },
  tableHeader: {
    bold: true,
    fontSize: 9,
    color: '#FFFFFF',
    fillColor: '#4338CA',
    alignment: 'center',
  },
  tableCell: {
    fontSize: 8.5,
    color: '#1F2937',
  },
  tableCellCenter: {
    fontSize: 8.5,
    color: '#1F2937',
    alignment: 'center',
  },
  cardYellow: {
    fontSize: 8.5,
    bold: true,
    color: '#92400E',
    fillColor: '#FEF3C7',
    alignment: 'center',
  },
  cardRed: {
    fontSize: 8.5,
    bold: true,
    color: '#991B1B',
    fillColor: '#FEE2E2',
    alignment: 'center',
  },
  badge: {
    fontSize: 8,
    bold: true,
    color: '#4338CA',
    fillColor: '#EEF2FF',
  },
};

/**
 * Generates a PDF document buffer for a game / match report.
 * @param {Object} game - Game document from Firestore
 * @returns {Promise<Buffer>}
 */
const generateGamePdf = async (game) => {
  const { id, data, title, date, location, sport, tournamentName, currentState } = game;

  const homeTeamName = data?.homeTeam?.name || 'Home Team';
  const awayTeamName = data?.awayTeam?.name || 'Away Team';
  const homeScore = currentState?.homeScore !== undefined ? currentState.homeScore : 0;
  const awayScore = currentState?.awayScore !== undefined ? currentState.awayScore : 0;
  const status = currentState?.status || 'Completed';

  const logoUrl = getLogoDataUrl();
  const gameLink = LinkUtils.generateGameLink(id || game._id || 'game');
  const qrDataUrl = await QrService.generateDataUrl(gameLink, { size: 120, margin: 0 });

  // Header content with Logo, Title, and QR Code
  const headerColumns = [];
  if (logoUrl) {
    headerColumns.push({
      image: logoUrl,
      width: 130,
      margin: [0, 5, 0, 0],
    });
  } else {
    headerColumns.push({
      text: 'Catch Me',
      fontSize: 20,
      bold: true,
      color: '#4338CA',
      width: 130,
    });
  }

  headerColumns.push({
    stack: [
      { text: 'OFFICIAL MATCH REPORT & VERIFICATION', style: 'headerTitle', alignment: 'center' },
      { text: title || `${homeTeamName} vs ${awayTeamName}`, fontSize: 11, bold: true, color: '#4B5563', alignment: 'center', margin: [0, 2, 0, 0] },
      { text: `Sport: ${sport || 'Football'} • Status: ${status.toUpperCase()}`, style: 'headerSubtitle', alignment: 'center' },
    ],
    width: '*',
  });

  headerColumns.push({
    stack: [
      { image: qrDataUrl, width: 55, height: 55, alignment: 'right' },
      { text: 'Scan for Live App', fontSize: 6.5, color: '#6B7280', alignment: 'right', margin: [0, 2, 0, 0] },
    ],
    width: 65,
  });

  const content = [
    { columns: headerColumns, margin: [0, 0, 0, 10] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#4338CA' }], margin: [0, 0, 0, 10] },

    // Match Details Bar
    {
      table: {
        widths: ['25%', '25%', '25%', '25%'],
        body: [
          [
            { text: 'Tournament / Event:', bold: true, fontSize: 8, color: '#4B5563', fillColor: '#F9FAFB' },
            { text: tournamentName || 'Standard Match', fontSize: 8.5, bold: true, color: '#111827', fillColor: '#F9FAFB' },
            { text: 'Date & Time:', bold: true, fontSize: 8, color: '#4B5563', fillColor: '#F9FAFB' },
            { text: date ? new Date(date).toLocaleString() : 'N/A', fontSize: 8.5, color: '#111827', fillColor: '#F9FAFB' },
          ],
          [
            { text: 'Venue / Location:', bold: true, fontSize: 8, color: '#4B5563', fillColor: '#F9FAFB' },
            { text: location || 'Stadium Arena', fontSize: 8.5, color: '#111827', fillColor: '#F9FAFB' },
            { text: 'Game ID:', bold: true, fontSize: 8, color: '#4B5563', fillColor: '#F9FAFB' },
            { text: id || 'N/A', fontSize: 7.5, color: '#6B7280', fillColor: '#F9FAFB' },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#E5E7EB',
        vLineColor: () => '#E5E7EB',
      },
      margin: [0, 0, 0, 10],
    },

    // Scoreboard Banner
    {
      table: {
        widths: ['*', 100, '*'],
        body: [
          [
            { text: homeTeamName, alignment: 'center', fontSize: 13, bold: true, color: '#1E1B4B', margin: [0, 8, 0, 8], fillColor: '#EEF2FF' },
            { text: `${homeScore} - ${awayScore}`, alignment: 'center', fontSize: 22, bold: true, color: '#4338CA', margin: [0, 4, 0, 4], fillColor: '#E0E7FF' },
            { text: awayTeamName, alignment: 'center', fontSize: 13, bold: true, color: '#1E1B4B', margin: [0, 8, 0, 8], fillColor: '#EEF2FF' },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 12],
    },
  ];

  // Extract game events, goals, and cards
  const events = data?.gameEvents || [];
  const goalsList = [];
  const cardsList = [];

  events.forEach((ev) => {
    const type = (ev.type || ev.description || '').toLowerCase();
    if (type.includes('goal') || type.includes('score')) {
      goalsList.push(ev);
    } else if (type.includes('yellow') || type.includes('red') || type.includes('card')) {
      cardsList.push(ev);
    }
  });

  // Section: Goals & Scorers
  content.push({ text: 'Match Goals & Scoring Timeline', style: 'sectionTitle' });
  if (goalsList.length > 0) {
    const goalsBody = [
      [
        { text: 'Time', style: 'tableHeader', width: 45 },
        { text: 'Team', style: 'tableHeader' },
        { text: 'Goal Scorer', style: 'tableHeader' },
        { text: 'Assist', style: 'tableHeader' },
        { text: 'Type / Details', style: 'tableHeader' },
      ],
    ];

    goalsList.forEach((g) => {
      goalsBody.push([
        { text: g.timestamp || g.minute || '-', style: 'tableCellCenter' },
        { text: g.team || g.teamName || '-', style: 'tableCell' },
        { text: g.playerName || g.scorerName || g.description || 'Goal', bold: true, style: 'tableCell' },
        { text: g.assistPlayerName || g.assist || 'None', style: 'tableCell' },
        { text: g.type || 'Standard Goal', style: 'tableCell' },
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: [45, '22%', '28%', '22%', '*'],
        body: goalsBody,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 8],
    });
  } else {
    content.push({ text: 'No goals recorded for this match.', fontSize: 8.5, color: '#6B7280', italics: true, margin: [0, 0, 0, 8] });
  }

  // Section: Disciplinary Log (Cards & Infractions)
  content.push({ text: 'Official Disciplinary Record (Cards & Warnings)', style: 'sectionTitle' });
  if (cardsList.length > 0) {
    const cardsBody = [
      [
        { text: 'Card', style: 'tableHeader', width: 60 },
        { text: 'Time', style: 'tableHeader', width: 45 },
        { text: 'Player Name', style: 'tableHeader' },
        { text: 'Team', style: 'tableHeader' },
        { text: 'Infraction / Reason', style: 'tableHeader' },
      ],
    ];

    cardsList.forEach((c) => {
      const isRed = (c.type || '').toLowerCase().includes('red') || (c.cardType || '').toLowerCase().includes('red');
      cardsBody.push([
        { text: isRed ? 'RED CARD' : 'YELLOW CARD', style: isRed ? 'cardRed' : 'cardYellow' },
        { text: c.timestamp || c.minute || '-', style: 'tableCellCenter' },
        { text: c.playerName || c.name || 'Player', bold: true, style: 'tableCell' },
        { text: c.team || c.teamName || '-', style: 'tableCell' },
        { text: c.reason || c.description || 'Foul / Misconduct', style: 'tableCell' },
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: [75, 45, '25%', '20%', '*'],
        body: cardsBody,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 8],
    });
  } else {
    content.push({ text: 'No card infractions issued during this match.', fontSize: 8.5, color: '#6B7280', italics: true, margin: [0, 0, 0, 8] });
  }

  // Team Rosters & Player Performance
  const homePlayers = data?.homeTeam?.players || [];
  const awayPlayers = data?.awayTeam?.players || [];

  if (homePlayers.length > 0 || awayPlayers.length > 0) {
    content.push({ text: 'Team Rosters & Individual Statistics', style: 'sectionTitle' });

    const renderRosterTable = (teamName, players) => {
      const rows = [
        [
          { text: 'No.', style: 'tableHeader', width: 25 },
          { text: 'Player Name', style: 'tableHeader' },
          { text: 'Pos', style: 'tableHeader', width: 30 },
          { text: 'Pts/G', style: 'tableHeader', width: 35 },
          { text: 'Ast', style: 'tableHeader', width: 30 },
          { text: 'Reb/Stl', style: 'tableHeader', width: 40 },
          { text: 'Cards', style: 'tableHeader', width: 35 },
          { text: 'Rating', style: 'tableHeader', width: 35 },
        ],
      ];

      players.forEach((p) => {
        const stats = p.stats || {};
        rows.push([
          { text: (p.number || p.jerseyNumber || '-').toString(), style: 'tableCellCenter' },
          { text: p.name || 'Athlete', bold: true, style: 'tableCell' },
          { text: p.position || '-', style: 'tableCellCenter' },
          { text: (stats.Pts || stats.goals || stats.points || '0').toString(), style: 'tableCellCenter' },
          { text: (stats.Ast || stats.assists || '0').toString(), style: 'tableCellCenter' },
          { text: (stats.Reb || stats.stl || stats.steals || '0').toString(), style: 'tableCellCenter' },
          { text: `Y:${stats.yellowCards || 0} R:${stats.redCards || 0}`, style: 'tableCellCenter' },
          { text: (p.rating || stats.rating || '6.0').toString(), bold: true, style: 'tableCellCenter', color: '#4338CA' },
        ]);
      });

      return [
        { text: `${teamName} Lineup`, fontSize: 10, bold: true, color: '#1E1B4B', margin: [0, 4, 0, 3] },
        {
          table: {
            headerRows: 1,
            widths: [25, '*', 30, 35, 30, 40, 40, 35],
            body: rows,
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 8],
        },
      ];
    };

    if (homePlayers.length > 0) {
      content.push(...renderRosterTable(homeTeamName, homePlayers));
    }
    if (awayPlayers.length > 0) {
      content.push(...renderRosterTable(awayTeamName, awayPlayers));
    }
  }

  // Official Sign-Off Box for Referee & Scouter
  content.push({
    text: 'Official Verification & Sign-Off',
    style: 'sectionTitle',
    pageBreak: 'before',
  });

  content.push({
    table: {
      widths: ['50%', '50%'],
      body: [
        [
          {
            stack: [
              { text: 'Match Referee Verification', bold: true, fontSize: 9, color: '#1E1B4B' },
              { text: 'I certify that the score, events, and disciplinary cards recorded above are accurate and official.', fontSize: 7.5, color: '#6B7280', margin: [0, 3, 0, 15] },
              { text: 'Referee Name: _________________________________', fontSize: 8 },
              { text: 'Signature:     _________________________________', fontSize: 8, margin: [0, 6, 0, 0] },
              { text: `Date Verified: ${new Date().toLocaleDateString()}`, fontSize: 8, margin: [0, 6, 0, 0] },
            ],
            padding: 8,
            fillColor: '#F9FAFB',
          },
          {
            stack: [
              { text: 'Official Scouter / Organizer Sign-Off', bold: true, fontSize: 9, color: '#1E1B4B' },
              { text: 'Recorded into the Catch Me official scouting and tournament registry.', fontSize: 7.5, color: '#6B7280', margin: [0, 3, 0, 15] },
              { text: 'Scouter / Official: ___________________________', fontSize: 8 },
              { text: 'Signature:          ___________________________', fontSize: 8, margin: [0, 6, 0, 0] },
              { text: `Date Logged:   ${new Date().toLocaleDateString()}`, fontSize: 8, margin: [0, 6, 0, 0] },
            ],
            padding: 8,
            fillColor: '#F9FAFB',
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#D1D5DB',
      vLineColor: () => '#D1D5DB',
    },
    margin: [0, 4, 0, 0],
  });

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: 'Helvetica' },
    styles: commonStyles,
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'Catch Me Platform • https://app.catchme.live', fontSize: 7.5, color: '#9CA3AF' },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 7.5, color: '#9CA3AF' },
      ],
      margin: [40, 15, 40, 0],
    }),
  };

  const pdfDoc = pdfmake.createPdf(docDefinition);
  return await pdfDoc.getBuffer();
};

/**
 * Generates an Athlete Scouting Dossier / Profile PDF.
 * @param {Object} user - User document from Firestore
 * @returns {Promise<Buffer>}
 */
const generateAthleteProfilePdf = async (user) => {
  const {
    id,
    name,
    username,
    gender,
    dob,
    age,
    country,
    location,
    bio,
    verified,
    level,
    xp,
    nextLevelXP,
    achievements = [],
    height,
    weight,
    contact = {},
    stats = [],
    roleData = {},
    interestedSports = [],
  } = user;

  const logoUrl = getLogoDataUrl();
  const profileLink = LinkUtils.generateProfileLink(id || user._id || 'athlete');
  const qrDataUrl = await QrService.generateDataUrl(profileLink, { size: 140, margin: 0 });

  // Header Columns
  const headerColumns = [];
  if (logoUrl) {
    headerColumns.push({
      image: logoUrl,
      width: 140,
      margin: [0, 5, 0, 0],
    });
  } else {
    headerColumns.push({
      text: 'Catch Me',
      fontSize: 22,
      bold: true,
      color: '#4338CA',
      width: 140,
    });
  }

  headerColumns.push({
    stack: [
      { text: 'OFFICIAL ATHLETE SCOUTING REPORT', style: 'headerTitle', alignment: 'center' },
      { text: `${name || 'Athlete'} ${verified ? '★ [VERIFIED]' : ''}`, fontSize: 13, bold: true, color: '#1E1B4B', alignment: 'center', margin: [0, 2, 0, 0] },
      { text: username ? `@${username}` : 'Catch Me Athlete Profile', style: 'headerSubtitle', alignment: 'center' },
    ],
    width: '*',
  });

  headerColumns.push({
    stack: [
      { image: qrDataUrl, width: 60, height: 60, alignment: 'right' },
      { text: 'Scan for App Profile', fontSize: 6.5, color: '#6B7280', alignment: 'right', margin: [0, 2, 0, 0] },
    ],
    width: 70,
  });

  const content = [
    { columns: headerColumns, margin: [0, 0, 0, 10] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#4338CA' }], margin: [0, 0, 0, 12] },

    // Physical & Demographic Profile Table
    { text: 'Athlete Demographics & Physical Profile', style: 'sectionTitle' },
    {
      table: {
        widths: ['25%', '25%', '25%', '25%'],
        body: [
          [
            { text: 'Full Name:', bold: true, fontSize: 8.5, color: '#4B5563', fillColor: '#F9FAFB' },
            { text: name || 'N/A', fontSize: 8.5, bold: true, color: '#111827', fillColor: '#F9FAFB' },
            { text: 'Primary Sport:', bold: true, fontSize: 8.5, color: '#4B5563', fillColor: '#F9FAFB' },
            { text: interestedSports?.[0] || roleData?.sport || 'General Sports', fontSize: 8.5, bold: true, color: '#4338CA', fillColor: '#F9FAFB' },
          ],
          [
            { text: 'Age / DOB:', bold: true, fontSize: 8.5, color: '#4B5563', fillColor: '#F9FAFB' },
            { text: `${age || (dob ? 'DOB: ' + dob : 'N/A')}`, fontSize: 8.5, color: '#111827', fillColor: '#F9FAFB' },
            { text: 'Gender:', bold: true, fontSize: 8.5, color: '#4B5563', fillColor: '#F9FAFB' },
            { text: gender || 'N/A', fontSize: 8.5, color: '#111827', fillColor: '#F9FAFB' },
          ],
          [
            { text: 'Height:', bold: true, fontSize: 8.5, color: '#4B5563', fillColor: '#F9FAFB' },
            { text: height?.value ? `${height.value} ${height.unit || 'cm'}` : 'N/A', fontSize: 8.5, color: '#111827', fillColor: '#F9FAFB' },
            { text: 'Weight:', bold: true, fontSize: 8.5, color: '#4B5563', fillColor: '#F9FAFB' },
            { text: weight?.value ? `${weight.value} ${weight.unit || 'kg'}` : 'N/A', fontSize: 8.5, color: '#111827', fillColor: '#F9FAFB' },
          ],
          [
            { text: 'Country / Location:', bold: true, fontSize: 8.5, color: '#4B5563', fillColor: '#F9FAFB' },
            { text: location || country || 'N/A', fontSize: 8.5, color: '#111827', fillColor: '#F9FAFB' },
            { text: 'Catch Me ID:', bold: true, fontSize: 8.5, color: '#4B5563', fillColor: '#F9FAFB' },
            { text: id || 'N/A', fontSize: 7.5, color: '#6B7280', fillColor: '#F9FAFB' },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#E5E7EB',
        vLineColor: () => '#E5E7EB',
      },
      margin: [0, 0, 0, 10],
    },

    // Bio & Scout Overview
    { text: 'Player Bio & Scouting Notes', style: 'sectionTitle' },
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: bio && bio.trim().length > 0 ? bio : 'Athlete registered on the Catch Me platform. Detailed scouting metrics, video highlights, and match performances are updated regularly.',
              fontSize: 8.5,
              color: '#374151',
              lineHeight: 1.3,
              fillColor: '#F9FAFB',
              margin: [4, 4, 4, 4],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#E5E7EB',
        vLineColor: () => '#E5E7EB',
      },
      margin: [0, 0, 0, 10],
    },

    // Gamification & Experience Progress
    { text: 'Gamification Level & Experience Progress', style: 'sectionTitle' },
    {
      table: {
        widths: ['25%', '25%', '25%', '25%'],
        body: [
          [
            { text: 'Current Level', alignment: 'center', bold: true, fontSize: 8.5, color: '#4338CA', fillColor: '#EEF2FF' },
            { text: 'Total XP Earned', alignment: 'center', bold: true, fontSize: 8.5, color: '#4338CA', fillColor: '#EEF2FF' },
            { text: 'Next Level Goal', alignment: 'center', bold: true, fontSize: 8.5, color: '#4338CA', fillColor: '#EEF2FF' },
            { text: 'Verified Status', alignment: 'center', bold: true, fontSize: 8.5, color: '#4338CA', fillColor: '#EEF2FF' },
          ],
          [
            { text: `Level ${level || 1}`, alignment: 'center', bold: true, fontSize: 13, color: '#1E1B4B' },
            { text: `${xp || 0} XP`, alignment: 'center', bold: true, fontSize: 13, color: '#1E1B4B' },
            { text: `${nextLevelXP || 1000} XP`, alignment: 'center', bold: true, fontSize: 13, color: '#1E1B4B' },
            { text: verified ? 'VERIFIED' : 'ACTIVE', alignment: 'center', bold: true, fontSize: 11, color: verified ? '#10B981' : '#6B7280' },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#E5E7EB',
        vLineColor: () => '#E5E7EB',
      },
      margin: [0, 0, 0, 10],
    },
  ];

  // Performance Statistics (if array or object)
  const statsList = Array.isArray(stats)
    ? stats
    : Object.entries(stats || {}).map(([label, value]) => ({ label, value }));

  if (statsList.length > 0) {
    content.push({ text: 'Official Athletic Performance Metrics', style: 'sectionTitle' });
    const statRows = [
      [
        { text: 'Metric / Attribute', style: 'tableHeader' },
        { text: 'Recorded Value', style: 'tableHeader', width: 100 },
      ],
    ];

    statsList.forEach((st) => {
      statRows.push([
        { text: st.label || st.name || 'Metric', style: 'tableCell' },
        { text: (st.value !== undefined ? st.value : '-').toString(), bold: true, style: 'tableCellCenter', color: '#4338CA' },
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 100],
        body: statRows,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 10],
    });
  }

  // Achievements (if any)
  if (achievements.length > 0) {
    content.push({ text: 'Key Achievements & Honors', style: 'sectionTitle' });
    const achList = achievements.map((a) => {
      const title = typeof a === 'string' ? a : a.title || a.name || 'Honor';
      return { text: `• ${title}`, fontSize: 8.5, color: '#1F2937', margin: [0, 1, 0, 1] };
    });
    content.push({ stack: achList, margin: [0, 0, 0, 10] });
  }

  // Contact & Social Handles
  content.push({ text: 'Contact & Verified Social Links', style: 'sectionTitle' });
  content.push({
    table: {
      widths: ['25%', '25%', '25%', '25%'],
      body: [
        [
          { text: 'Email:', bold: true, fontSize: 8, color: '#4B5563', fillColor: '#F9FAFB' },
          { text: contact?.email || user.email || 'N/A', fontSize: 8, color: '#111827', fillColor: '#F9FAFB' },
          { text: 'Phone:', bold: true, fontSize: 8, color: '#4B5563', fillColor: '#F9FAFB' },
          { text: contact?.phone || 'N/A', fontSize: 8, color: '#111827', fillColor: '#F9FAFB' },
        ],
        [
          { text: 'Instagram:', bold: true, fontSize: 8, color: '#4B5563', fillColor: '#F9FAFB' },
          { text: contact?.instagram ? `@${contact.instagram.replace('@', '')}` : 'N/A', fontSize: 8, color: '#111827', fillColor: '#F9FAFB' },
          { text: 'X (Twitter):', bold: true, fontSize: 8, color: '#4B5563', fillColor: '#F9FAFB' },
          { text: contact?.x ? `@${contact.x.replace('@', '')}` : 'N/A', fontSize: 8, color: '#111827', fillColor: '#F9FAFB' },
        ],
        [
          { text: 'TikTok:', bold: true, fontSize: 8, color: '#4B5563', fillColor: '#F9FAFB' },
          { text: contact?.tiktok ? `@${contact.tiktok.replace('@', '')}` : 'N/A', fontSize: 8, color: '#111827', fillColor: '#F9FAFB' },
          { text: 'YouTube:', bold: true, fontSize: 8, color: '#4B5563', fillColor: '#F9FAFB' },
          { text: contact?.youtube || 'N/A', fontSize: 8, color: '#111827', fillColor: '#F9FAFB' },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#E5E7EB',
      vLineColor: () => '#E5E7EB',
    },
    margin: [0, 0, 0, 10],
  });

  // Footer Scout Note
  content.push({
    text: 'Scan the QR code above or visit https://app.catchme.live to review live match video highlights, verified stats history, and initiate direct communication with the athlete or their representative.',
    fontSize: 7.5,
    italics: true,
    color: '#6B7280',
    alignment: 'center',
    margin: [0, 10, 0, 0],
  });

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: 'Helvetica' },
    styles: commonStyles,
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'Catch Me Scouting Intelligence • https://app.catchme.live', fontSize: 7.5, color: '#9CA3AF' },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 7.5, color: '#9CA3AF' },
      ],
      margin: [40, 15, 40, 0],
    }),
  };

  const pdfDoc = pdfmake.createPdf(docDefinition);
  return await pdfDoc.getBuffer();
};

/**
 * Generates an Organizer Daily Summary Report PDF.
 * @param {Object} summaryData - { date, sport, tournamentName, games, performers, cards, goals }
 * @returns {Promise<Buffer>}
 */
const generateDailySummaryPdf = async (summaryData) => {
  const {
    date = new Date().toISOString().split('T')[0],
    sport = 'All Sports',
    tournamentName = 'Catch Me Tournaments',
    games = [],
    performers = [],
    cards = [],
    goals = [],
  } = summaryData;

  const logoUrl = getLogoDataUrl();
  const summaryLink = `https://app.catchme.live/daily-summary?date=${encodeURIComponent(date)}`;
  const qrDataUrl = await QrService.generateDataUrl(summaryLink, { size: 120, margin: 0 });

  const headerColumns = [];
  if (logoUrl) {
    headerColumns.push({
      image: logoUrl,
      width: 130,
      margin: [0, 5, 0, 0],
    });
  } else {
    headerColumns.push({
      text: 'Catch Me',
      fontSize: 20,
      bold: true,
      color: '#4338CA',
      width: 130,
    });
  }

  headerColumns.push({
    stack: [
      { text: 'ORGANIZER & SCOUT DAILY SUMMARY', style: 'headerTitle', alignment: 'center' },
      { text: `Report Date: ${date} • Sport: ${sport}`, fontSize: 10, bold: true, color: '#4B5563', alignment: 'center', margin: [0, 2, 0, 0] },
      { text: tournamentName, style: 'headerSubtitle', alignment: 'center' },
    ],
    width: '*',
  });

  headerColumns.push({
    stack: [
      { image: qrDataUrl, width: 55, height: 55, alignment: 'right' },
      { text: 'Scan for App View', fontSize: 6.5, color: '#6B7280', alignment: 'right', margin: [0, 2, 0, 0] },
    ],
    width: 65,
  });

  const content = [
    { columns: headerColumns, margin: [0, 0, 0, 10] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#4338CA' }], margin: [0, 0, 0, 10] },

    // KPI Metrics Tiles
    {
      table: {
        widths: ['25%', '25%', '25%', '25%'],
        body: [
          [
            { text: 'Total Matches', alignment: 'center', bold: true, fontSize: 8, color: '#4338CA', fillColor: '#EEF2FF' },
            { text: 'Goals / Points', alignment: 'center', bold: true, fontSize: 8, color: '#4338CA', fillColor: '#EEF2FF' },
            { text: 'Yellow Cards', alignment: 'center', bold: true, fontSize: 8, color: '#92400E', fillColor: '#FEF3C7' },
            { text: 'Red Cards', alignment: 'center', bold: true, fontSize: 8, color: '#991B1B', fillColor: '#FEE2E2' },
          ],
          [
            { text: games.length.toString(), alignment: 'center', bold: true, fontSize: 15, color: '#1E1B4B' },
            { text: goals.length.toString(), alignment: 'center', bold: true, fontSize: 15, color: '#1E1B4B' },
            { text: cards.filter((c) => (c.cardType || '').toLowerCase().includes('yellow')).length.toString(), alignment: 'center', bold: true, fontSize: 15, color: '#92400E' },
            { text: cards.filter((c) => (c.cardType || '').toLowerCase().includes('red')).length.toString(), alignment: 'center', bold: true, fontSize: 15, color: '#991B1B' },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#E5E7EB',
        vLineColor: () => '#E5E7EB',
      },
      margin: [0, 0, 0, 10],
    },
  ];

  // Section 1: Day's Top Performers
  content.push({ text: "Day's Top Performers (Scout Watchlist)", style: 'sectionTitle' });
  if (performers.length > 0) {
    const perfBody = [
      [
        { text: 'Rank', style: 'tableHeader', width: 28 },
        { text: 'Athlete Name', style: 'tableHeader' },
        { text: 'Team', style: 'tableHeader' },
        { text: 'Rating', style: 'tableHeader', width: 35 },
        { text: 'Goals/Pts', style: 'tableHeader', width: 45 },
        { text: 'Ast', style: 'tableHeader', width: 30 },
        { text: 'Cards', style: 'tableHeader', width: 35 },
      ],
    ];

    performers.slice(0, 15).forEach((p, idx) => {
      perfBody.push([
        { text: `#${idx + 1}`, style: 'tableCellCenter', bold: true },
        { text: p.name || 'Athlete', bold: true, style: 'tableCell' },
        { text: p.teamName || p.team || '-', style: 'tableCell' },
        { text: (p.rating || '6.0').toString(), bold: true, style: 'tableCellCenter', color: '#4338CA' },
        { text: (p.goals !== undefined ? p.goals : p.points || 0).toString(), style: 'tableCellCenter' },
        { text: (p.assists || 0).toString(), style: 'tableCellCenter' },
        { text: `Y:${p.yellowCards || 0} R:${p.redCards || 0}`, style: 'tableCellCenter' },
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: [28, '*', '25%', 35, 45, 30, 35],
        body: perfBody,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 10],
    });
  } else {
    content.push({ text: 'No performers recorded for this date.', fontSize: 8.5, color: '#6B7280', italics: true, margin: [0, 0, 0, 10] });
  }

  // Section 2: Disciplinary Record (Cards)
  content.push({ text: 'Official Disciplinary Log (All Cards Issued)', style: 'sectionTitle' });
  if (cards.length > 0) {
    const cardsBody = [
      [
        { text: 'Card', style: 'tableHeader', width: 65 },
        { text: 'Time', style: 'tableHeader', width: 35 },
        { text: 'Player Name', style: 'tableHeader' },
        { text: 'Team', style: 'tableHeader' },
        { text: 'Match', style: 'tableHeader' },
        { text: 'Reason / Infraction', style: 'tableHeader' },
      ],
    ];

    cards.forEach((c) => {
      const isRed = (c.cardType || '').toLowerCase().includes('red');
      cardsBody.push([
        { text: isRed ? 'RED' : 'YELLOW', style: isRed ? 'cardRed' : 'cardYellow' },
        { text: c.minute || c.timestamp || '-', style: 'tableCellCenter' },
        { text: c.playerName || 'Player', bold: true, style: 'tableCell' },
        { text: c.teamName || '-', style: 'tableCell' },
        { text: c.matchTitle || 'Match', style: 'tableCell' },
        { text: c.reason || 'Foul / Misconduct', style: 'tableCell' },
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: [50, 35, '22%', '18%', '20%', '*'],
        body: cardsBody,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 10],
    });
  } else {
    content.push({ text: 'No disciplinary cards issued on this date.', fontSize: 8.5, color: '#6B7280', italics: true, margin: [0, 0, 0, 10] });
  }

  // Section 3: Goals Summary
  content.push({ text: "Day's Goals & Scoring Log", style: 'sectionTitle' });
  if (goals.length > 0) {
    const goalsBody = [
      [
        { text: 'Time', style: 'tableHeader', width: 35 },
        { text: 'Goal Scorer', style: 'tableHeader' },
        { text: 'Team', style: 'tableHeader' },
        { text: 'Match', style: 'tableHeader' },
        { text: 'Assist Maker', style: 'tableHeader' },
      ],
    ];

    goals.forEach((g) => {
      goalsBody.push([
        { text: g.minute || g.timestamp || '-', style: 'tableCellCenter' },
        { text: g.scorerName || 'Player', bold: true, style: 'tableCell' },
        { text: g.teamName || '-', style: 'tableCell' },
        { text: g.matchTitle || 'Match', style: 'tableCell' },
        { text: g.assistName || 'None', style: 'tableCell' },
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: [35, '25%', '20%', '25%', '*'],
        body: goalsBody,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 10],
    });
  } else {
    content.push({ text: 'No goals recorded for this date.', fontSize: 8.5, color: '#6B7280', italics: true, margin: [0, 0, 0, 10] });
  }

  // Section 4: Match Verification & Results
  content.push({ text: 'Matches Summary & Verification Status', style: 'sectionTitle' });
  if (games.length > 0) {
    const matchBody = [
      [
        { text: 'Match Title / Teams', style: 'tableHeader' },
        { text: 'Score', style: 'tableHeader', width: 60 },
        { text: 'Status', style: 'tableHeader', width: 70 },
        { text: 'Official Verification', style: 'tableHeader', width: 100 },
      ],
    ];

    games.forEach((g) => {
      const home = g.data?.homeTeam?.name || 'Home';
      const away = g.data?.awayTeam?.name || 'Away';
      const hs = g.currentState?.homeScore !== undefined ? g.currentState.homeScore : 0;
      const as = g.currentState?.awayScore !== undefined ? g.currentState.awayScore : 0;
      const st = g.currentState?.status || 'completed';

      matchBody.push([
        { text: `${home} vs ${away}`, bold: true, style: 'tableCell' },
        { text: `${hs} - ${as}`, bold: true, color: '#4338CA', style: 'tableCellCenter' },
        { text: st.toUpperCase(), style: 'tableCellCenter' },
        { text: 'OFFICIAL RECORD', style: 'tableCellCenter', color: '#10B981', bold: true },
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 60, 70, 100],
        body: matchBody,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 10],
    });
  }

  // Tournament Director Sign-Off
  content.push({
    table: {
      widths: ['*'],
      body: [
        [
          {
            stack: [
              { text: 'Tournament Director & Head Official Certification', bold: true, fontSize: 9, color: '#1E1B4B' },
              { text: 'This daily summary is officially validated and archived for competition records, scouting, and disciplinary review.', fontSize: 7.5, color: '#6B7280', margin: [0, 2, 0, 12] },
              {
                columns: [
                  { text: 'Head Official Name: __________________________', fontSize: 8 },
                  { text: 'Signature: __________________________', fontSize: 8 },
                  { text: `Date: ${new Date().toLocaleDateString()}`, fontSize: 8 },
                ],
              },
            ],
            padding: 8,
            fillColor: '#F9FAFB',
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#D1D5DB',
      vLineColor: () => '#D1D5DB',
    },
    margin: [0, 10, 0, 0],
  });

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: 'Helvetica' },
    styles: commonStyles,
    content,
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'Catch Me Organizer Summary • https://app.catchme.live', fontSize: 7.5, color: '#9CA3AF' },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 7.5, color: '#9CA3AF' },
      ],
      margin: [40, 15, 40, 0],
    }),
  };

  const pdfDoc = pdfmake.createPdf(docDefinition);
  return await pdfDoc.getBuffer();
};

module.exports = {
  generateGamePdf,
  generateAthleteProfilePdf,
  generateDailySummaryPdf,
};
