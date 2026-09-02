const express = require('express');
const router = express.Router();
const {
  getScoutDashboardView,
  getDailySummary,
  exportDailySummaryPdf,
  exportDailySummaryCsv,
  exportAthleteProfilePdf,
} = require('../controllers/scoutController');
const { downloadGamePdf } = require('../controllers/gameController');

// HTML Tablet Dashboard View
router.get('/', getScoutDashboardView);
router.get('/view', getScoutDashboardView);

// Daily Summary (JSON, PDF, CSV)
router.get('/daily-summary', getDailySummary);
router.get('/daily-summary/pdf', exportDailySummaryPdf);
router.get('/daily-summary/csv', exportDailySummaryCsv);

// Athlete Scout Profile PDF
router.get('/profile/:id/pdf', exportAthleteProfilePdf);
router.get('/athlete/:id/pdf', exportAthleteProfilePdf);

// Game Match Report PDF
router.get('/game/:id/pdf', downloadGamePdf);

module.exports = router;
