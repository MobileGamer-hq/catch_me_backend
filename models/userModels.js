const userProfileDataModel = {
    // --- Basic User Info ---
    id: "", // string
    username: "", // string
    email: "", // string
    password: "", // string
    name: "", // string
    gender: "", // string
    dob: "", // string (Date of Birth)
    age: 0, // number
    country: "", // string
    location: "", // string
    bio: "", // string
    profilePic: "", // string (URL/Path to profile picture)

    // --- Account Status & Metadata ---
    role: "", // string (Now empty)
    verified: false, // boolean
    requestVerification: false, // boolean
    createdAt: "", // string (Timestamp)
    updatedAt: "", // string (Timestamp)
    Database_location: "", // string

    // --- Social & Network ---
    followers: [], // array
    following: [], // array
    chats: [], // array
    blockedUsers: [], // array

    // --- Content & Activity ---
    posts: [], // array
    imagePost: [], // array
    highlights: [], // array
    story: [], // array
    thoughts: [], // array
    archivedPosts: [], // array
    likedPosts: [], // array
    savedPosts: [], // array

    // --- Interests & Tags ---
    tags: [], // array
    interestedTags: [], // array
    interestedSports: [], // array
    favoriteSports: [], // array
    interestedTeams: [], // array
    favoriteTeams: [], // array
    interestedAthletes: [], // array
    favoriteAthletes: [], // array

    // --- Physical Attributes ---
    height: { // map
        unit: "", // string
        value: 0 // number
    },
    weight: { // map
        unit: "", // string
        value: 0 // number
    },

    // --- Gamification & Progress ---
    level: 0, // number
    experiencePoints: 0, // number
    xp: 0, // number (Current XP)
    nextLevelXP: 0, // number
    achievements: [], // array

    // --- Athlete Role Data (Now empty) ---
    roleData: {}, // map (Now empty)

    // --- Events, Games, Challenges ---
    games: [], // array
    myGames: [], // array
    challenges: [], // array
    myChallenges: [], // array
    pendingChallenges: [], // array
    tournaments: [], // array
    myTournaments: [], // array
    customEvents: [], // array
    myCustomEvents: [], // array
    schedule: [], // array
    seasons: [], // array

    // --- Groups & Communities ---
    clubs: [], // array
    groups: [], // array
    leagues: [], // array
    joinedCommunities: [], // array

    // --- Contact Info ---
    contact: { // map
        email: "", // string
        phone: "", // string
        website: "", // string
        facebook: "", // string
        instagram: "", // string
        x: "", // string (Twitter)
        youtube: "", // string
        tiktok: "", // string
        snapchat: "" // string
    },

    // --- Algorithmic & Feed Data ---
    algorithmData: {}, // map
    trendingEngagement: [], // array

    feed: { // map (User's personalized feed content)
        posts: [], // array
        highlights: [], // array
        stories: [], // array
        events: [], // array
        games: [], // array
        thoughts: [] // array
    },

    // --- Search & View History ---
    searchHistory: [], // array
    recentSearches: [], // array
    recentViewedProfiles: [], // array

    // --- Analytics & Activity Tracking ---
    analytics: {}, // map
    lastActive: null, // null
    profileViews: 0, // number
    postViews: [], // array
    timeSpentDaily: [], // array

    // --- Notifications & Warnings ---
    notifications: [], // array

    flags: { // map
        banned: false, // boolean
        banReason: "", // string
        warnings: 0, // number
        reportsAgainst: [] // array
    },

    // --- User Settings ---
    settings: { // map
        darkMode: false, // boolean
        language: "", // string
        privateProfile: false, // boolean
        showAge: false, // boolean
        showLocation: false, // boolean
        allowMessagesFrom: "", // string
        pushNotifications: { // map
            likes: false, // boolean
            comments: false, // boolean
            follows: false, // boolean
            messages: false // boolean
        }
    }
};