const pdfmake = require('pdfmake');

// We use the standard 14 fonts that don't need external files in PDF format
pdfmake.setFonts({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
});
pdfmake.setUrlAccessPolicy(() => true);
pdfmake.setLocalAccessPolicy(() => true);

/**
 * Generates a PDF buffer for a game.
 * @param {Object} game - The game document from Firestore
 * @returns {Promise<Buffer>}
 */
const generateGamePdf = async (game) => {
  const { data, title, date, location, sport, tournamentName, currentState } = game;
  
  const homeTeamName = data?.homeTeam?.name || 'Home Team';
  const awayTeamName = data?.awayTeam?.name || 'Away Team';
  const homeScore = currentState?.homeScore || 0;
  const awayScore = currentState?.awayScore || 0;
  
  const docDefinition = {
    defaultStyle: {
      font: 'Helvetica'
    },
    content: [
      { text: 'Game Report', style: 'header' },
      { text: title || `${homeTeamName} vs ${awayTeamName}`, style: 'subheader' },
      { text: `Date: ${date ? new Date(date).toLocaleDateString() : 'N/A'}` },
      { text: `Location: ${location || 'N/A'}` },
      { text: `Sport: ${sport || 'N/A'}` },
      { text: `Tournament: ${tournamentName || 'N/A'}` },
      
      { text: 'Final Score', style: 'sectionHeader', margin: [0, 20, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*'],
          body: [
            [{ text: homeTeamName, style: 'tableHeader' }, { text: awayTeamName, style: 'tableHeader' }],
            [{ text: homeScore.toString(), alignment: 'center', fontSize: 24 }, { text: awayScore.toString(), alignment: 'center', fontSize: 24 }]
          ]
        }
      },

      { text: 'Game Events', style: 'sectionHeader', margin: [0, 20, 0, 10] },
    ],
    styles: {
      header: {
        fontSize: 22,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 16,
        bold: true,
        margin: [0, 10, 0, 5]
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 15, 0, 5]
      },
      tableHeader: {
        bold: true,
        fontSize: 13,
        color: 'black',
        alignment: 'center'
      }
    }
  };

  // Add Game Events
  if (data?.gameEvents && data.gameEvents.length > 0) {
    const eventsBody = [
      [
        { text: 'Time', style: 'tableHeader' }, 
        { text: 'Team', style: 'tableHeader' }, 
        { text: 'Event', style: 'tableHeader' }
      ]
    ];

    data.gameEvents.forEach(event => {
      eventsBody.push([
        event.timestamp ? event.timestamp.toString() : '-',
        event.team || '-',
        event.description || event.type || '-'
      ]);
    });

    docDefinition.content.push({
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', '*'],
        body: eventsBody
      }
    });
  } else {
    docDefinition.content.push({ text: 'No events recorded.' });
  }

  // Add Team Lineups & Stats
  if (data?.homeTeam?.players && data.homeTeam.players.length > 0) {
    docDefinition.content.push({ text: `${homeTeamName} Players`, style: 'sectionHeader', margin: [0, 20, 0, 10] });
    const homePlayersBody = [
      ['Name', 'No.', 'Position', 'Pts', 'Reb', 'Ast', 'Stl', 'Blk']
    ];
    data.homeTeam.players.forEach(p => {
      homePlayersBody.push([
        p.name || '-',
        p.number || '-',
        p.position || '-',
        p.stats?.Pts?.toString() || '0',
        p.stats?.Reb?.toString() || '0',
        p.stats?.Ast?.toString() || '0',
        p.stats?.Stl?.toString() || '0',
        p.stats?.Blk?.toString() || '0'
      ]);
    });
    docDefinition.content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: homePlayersBody
      }
    });
  }

  if (data?.awayTeam?.players && data.awayTeam.players.length > 0) {
    docDefinition.content.push({ text: `${awayTeamName} Players`, style: 'sectionHeader', margin: [0, 20, 0, 10] });
    const awayPlayersBody = [
      ['Name', 'No.', 'Position', 'Pts', 'Reb', 'Ast', 'Stl', 'Blk']
    ];
    data.awayTeam.players.forEach(p => {
      awayPlayersBody.push([
        p.name || '-',
        p.number || '-',
        p.position || '-',
        p.stats?.Pts?.toString() || '0',
        p.stats?.Reb?.toString() || '0',
        p.stats?.Ast?.toString() || '0',
        p.stats?.Stl?.toString() || '0',
        p.stats?.Blk?.toString() || '0'
      ]);
    });
    docDefinition.content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: awayPlayersBody
      }
    });
  }

  const pdfDoc = pdfmake.createPdf(docDefinition);
  return await pdfDoc.getBuffer();
};

module.exports = {
  generateGamePdf
};
