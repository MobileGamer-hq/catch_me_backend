const user = {
  id: "",
  email: "",
  password: "",
  verified: false,
  createdAt: null,
  updatedAt: null,

  // Profile Info
  firstName: "",
  lastName: "",
  username: "",
  bio: "",
  profilePic: "",
  bannerPic: "",

  gender: "", // male, female, other
  dob: null,
  age: 0,
  country: "",
  location: "",

  height: { value: 0, unit: "cm" },
  weight: { value: 0, unit: "kg" },

  // Contact / Socials
  contact: {
    email: "",
    phone: "",
    instagram: "",
    x: "",
    facebook: "",
    snapchat: "",
    tiktok: "",
    youtube: "",
    website: "",
  },

  role: "", // casual, athlete, coach, scout
  roleData: null, // refer to one of the role models

  // Connections
  chats: [],
  followers: [],
  following: [],
  blockedUsers: [],
  connectionRequests: [],

  // Content
  posts: [],
  thoughts: [],
  highlights: [],
  archivedPosts: [],

  // Engagement
  savedPosts: [],
  likedPosts: [],
  reports: [],
  notifications: [],

  // Personalization
  algorithmData: {
    tags: [],
    interestedSports: [],
    searchHistory: [],
    recentViewedProfiles: [],
    trendingEngagement: [],
  },

  // Preferences
  settings: {
    privateProfile: false,
    showAge: true,
    showLocation: true,
    darkMode: false,
    language: "en",
    allowMessagesFrom: "everyone", // friends, followers, verified, none
    pushNotifications: {
      messages: true,
      likes: true,
      comments: true,
      follows: true,
    }
  },

  // Analytics
  analytics: {
    profileViews: 0,
    postViews: [], // { postId: "", views: 0 }
    lastActive: null,
    timeSpentDaily: [], // [{ date, minutes }]
  },

  // Authentication & Security
  auth: {
    lastLogin: null,
    loginHistory: [], // [{ device, time, location }]
    twoFactorEnabled: false,
    passwordChangedAt: null,
  },

  // Badges & Progress
  achievements: [], // ["Top Scorer", "MVP", ...]
  experiencePoints: 0,
  level: 1,
  nextLevelXP: 1000,

  // Interests
  favoriteAthletes: [],
  favoriteTeams: [],
  favoriteSports: [],
  joinedCommunities: [],

  // Moderation & Trust
  flags: {
    warnings: 0,
    banned: false,
    banReason: "",
    reportsAgainst: [],
  },

  // Monetization or Subscription
  plan: {
    type: "free", // free, premium, pro
    expiresAt: null,
    renewal: false,
  },

  // Activity Log
  activity: [
  ],
};

const userActivity = {
  type: "post_created",
  timestamp: null,
  description: "User posted a new highlight",
};



const casual = { id: "", notes: "" };

const athlete = {
  id: "",
  bio: "",
  stats,
  skills,
  sports: [],
  mainSport: "",
  teams: [],
  games: [],
  mainTeam: "",
  sportSpecificData: {}, // links to sport-specific profile data
};

const coach = {
  id: "",
  sports: [],
  mainSport: "",
  team: [],
  mainTeam: "",
  games: [],
  certifications: [],
  experienceYears: 0,
};

const scout = {
  id: "",
  employer: "",
  verified: true,
  specialty: [],
  viewedProfiles: [],
};


const team = {
  id: "",
  name: "",
  sport: "",
  athletes: [],
  coaches: [],
  games: [],
  logo: "",
  banner: "",
  city: "",
  mainCoach: "",
  joinRequests: [],
  achievements: [],
  stats,
};

const league = {
  id: "",
  sport: "",
  name: "",
  type: "", // e.g. High School, College, Club
  seasons: [],
  teams: [],
};

const season = {
  id: "",
  name: "",
  startDate: null,
  endDate: null,
  teams: [],
  games: [],
  createdBy: "",
};

const game = {
  id: "",
  sport: "",
  location: "",
  startTime: null,
  endTime: null,
  createdBy: "",

  home: "",
  away: "",

  athletes: [],
  scores: { home: 0, away: 0 },
  scoreSheet: {
    home: [scoreData],
    away: [scoreData],
  },
};


// Score Data Model: Represents a scoring play in a match
const scoreData = {
  id: "",                  // Unique ID of the score entry
  athlete: "",             // ID or username of athlete
  points: 0,               // Points scored
  time: "",                // Time in the match (e.g. "12:45", or seconds)
  playDescription: "",     // Description of what happened
};

// Match Data Model: Represents a single match between two teams or players
const match = {
  id: "",                  // Unique match ID
  sport: "",               // e.g. "football", "basketball"
  type: "",                // e.g. "friendly", "league", "tournament"
  
  home: {
    teamId: "",
    score: 0,
    players: [],           // Optional: player IDs
  },

  away: {
    teamId: "",
    score: 0,
    players: [],
  },

  startTime: null,         // Date object
  endTime: null,           // Date object

  createdBy: "",           // ID of user or organization
  scoreSheet: [],          // Array of scoreData
};

// Tournament Data Model: Represents a tournament with multiple teams and games
const tournament = {
  id: "",                  // Unique ID
  name: "",                // Tournament name
  type: "",                // e.g. "knockout", "league", "group-stage"
  
  teams: [
    {
      id: "",
      name: "",
      logo: "",
      players: [],         // Array of player IDs
    }
  ],

  games: [
    {
      matchId: "",
      round: "",           // Optional: "Quarterfinal", "Group A", etc.
    }
  ],

  startDate: null,         // Date object
  endDate: null,           // Date object

  createdBy: "",           // ID of user or organization
};

// Leaderboard Data Model: Player or team rankings
const leaderboard = {
  id: "",                  // Unique ID
  title: "",               // Leaderboard name/title
  description: "",         // Optional info
  
  type: "team",            // or "player"
  sport: "",               // e.g. "football"

  data: [
    {
      id: "",              // team ID or player ID
      name: "",
      score: 0,
      rank: 0,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    }
  ],
};


const leaderboardTeamData = {
  id: "",
  team: "",
  points: 0,
  wins: 0,
  losses: 0,
  draws: 0,
};

const leaderboardPlayerData = {
  id: "",
  athlete: "",
  team: "",
  points: 0,
  stats: {},
};


const post = {
  id: "",
  user: "",
  files: [],
  caption: "",
  tags: [],
  likes: [],
  comments: [],
  shares: [],
  createdAt: null,
};

const thoughts = {
  id: "",
  user: "",
  text: "",
  comments: [],
  likes: [],
  createdAt: null,
};

const highlights = {
  id: "",
  user: "",
  video: "",
  caption: "",
  tags: [],
  likes: [],
  comments: [],
  shares: [],
  createdAt: null,
};

const comment = {
  id: "",
  user: "",
  post: "",
  text: "",
  createdAt: null,
};

const chat = {
  id: "",
  accounts: [],
  messages: [],
  options: {
    isGroup: false,
    groupName: "",
    groupIcon: "",
  },
};

const message = {
  id: "",
  sender: "",
  message: "",
  media: "",
  timeSent: null,
};

const notification = {
  id: "",
  user: "",
  message: "",
  linkTo: "",
  read: false,
  sendTime: null,
  sendDate: null
};


const sponsoredAd = {
  id: "",
  title: "",
  image: "",
  link: "",
  impressions: 0,
  clicks: 0,
  createdBy: "",
  sportTarget: [],
};

const report = {
  id: "",
  type: "user" | "post" | "comment",
  reportedBy: "",
  targetId: "",
  reason: "",
  comment: "",
};


const feed = {
  id: "",
  user: "",
  content: [],
};

const skills = {
  id: "",
  categories: [],
};

const stats = [
  { label: "Speed", value: 0 },
  { label: "Agility", value: 0 },
  { label: "Strength", value: 0 },
  { label: "Endurance", value: 0 },
  { label: "Power", value: 0 },
  { label: "Flexibility", value: 0 },
  { label: "Reaction", value: 0 },
  { label: "Coordination", value: 0 },
];

const sports = [
  "Football", "Basketball", "Baseball", "American Football", "Tennis", "Golf",
  "Hockey", "Volleyball", "Wrestling", "Boxing", "Swimming", "Track and Field",
  "Lacrosse", "Gymnastics", "MMA",
];

const sportProfiles = {
  football: footballData,
  basketball: basketballData,
  tennis: tennisData,
  baseball: baseballData,
  volleyball: volleyballData,
  trackAndField: trackAndFieldData,
};




// Exporting the models for use in other files
module.exports = {
  //

  //
  scoreData,
  match,
  tournament,
  leaderboard,
};
