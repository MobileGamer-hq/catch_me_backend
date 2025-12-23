const allPermissions = [
  // Account actions
  "createAccount",
  "deleteAccount",
  "requestVerification",
  "verifyUser",

  // Content actions
  "uploadPost",
  "uploadHighlight",
  "uploadThought",
  "deleteOwnContent",
  "reportContent",

  // Game, Tournament, Season (Events)
  "createGame",
  "createTournament",
  "createSeason",
  "manageOwnGame",
  "manageOwnTournament",
  "manageOwnSeason",
  "manageAnyGame",
  "manageAnyTournament",
  "manageAnySeason",

  // Stats
  "viewStats",
  "editOwnStats",
  "editPlayerStats",

  // Feed & algorithm
  "accessFeed",
  "accessAlgorithms",

  // Sponsorships & ads
  "viewAds",
  "createSponsoredAd",

  // Reports
  "reportUser",
  "reportPost",
  "reportGame",
  "reportTournament",
  "reportSeason",
];

const permissions = {
  user: {
    role: "user",
    permissions: [
      "createAccount",
      "deleteAccount",
      "requestVerification",
      "uploadPost",
      "uploadHighlight",
      "uploadThought",
      "reportUser",
      "reportPost",
      "reportGame",
      "reportTournament",
      "reportSeason",
      "viewStats",
      "accessFeed",
      "viewAds",
    ],
  },

  athlete: {
    role: "athlete",
    permissions: [
      "uploadPost",
      "uploadHighlight",
      "uploadThought",
      "editOwnStats",
      "reportContent",
      "viewStats",
      "accessFeed",
      "viewAds",
    ],
  },

  verifiedAthlete: {
    role: "verifiedAthlete",
    permissions: [
      "uploadPost",
      "uploadHighlight",
      "uploadThought",
      "createTournament",
      "manageOwnTournament",
      "editOwnStats",
      "reportContent",
      "viewStats",
      "accessFeed",
      "viewAds",
    ],
  },

  coach: {
    role: "coach",
    permissions: [
      "uploadPost",
      "uploadHighlight",
      "uploadThought",
      "createGame",
      "createTournament",
      "manageOwnGame",
      "manageOwnTournament",
      "editPlayerStats",
      "reportContent",
      "viewStats",
      "accessFeed",
      "viewAds",
    ],
  },

  team: {
    role: "team",
    permissions: [
      "uploadPost",
      "uploadHighlight",
      "uploadThought",
      "createGame",
      "createTournament",
      "manageOwnGame",
      "manageOwnTournament",
      "reportContent",
      "viewStats",
      "accessFeed",
      "viewAds",
    ],
  },

  league: {
    role: "league",
    permissions: [
      "uploadPost",
      "uploadHighlight",
      "uploadThought",
      "createGame",
      "createSeason",
      "createTournament",
      "manageOwnGame",
      "manageOwnSeason",
      "manageOwnTournament",
      "reportContent",
      "viewStats",
      "accessFeed",
      "createSponsoredAd",
      "viewAds",
    ],
  },

  admin: {
    role: "admin",
    permissions: [
      ...allPermissions, // give full access
    ],
  },
};
