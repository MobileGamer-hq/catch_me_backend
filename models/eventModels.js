const gameDataModel = {
    // --- Core Metadata ---
    id: "", // string
    type: "", // string (e.g., "game")
    sport: "", // string
    title: "", // string
    location: "", // string
    tournamentId: "", // string
    tournamentName: "", // string
    isTeamGame: false, // boolean
    createdAt: "", // string (Timestamp)
    Database_location: "", // string

    // --- Game Time & Status ---
    date: "", // string (Date of the game)
    time: "", // string (Time of the game)
    duration: 0, // number (Total duration, e.g., in minutes)
    periods: 0, // number (Number of periods/halves)

    currentState: { // map (Real-time score and status)
        status: "", // string (e.g., "paused", "live", "finished")
        period: 0, // number (Current period)
        homeScore: 0, // number
        awayScore: 0, // number
        timeLeft: 0 // number (Milliseconds left in the period)
    },

    // --- Game Data (Content) ---
    data: { // map (The main container for detailed game information)
        // --- Away Team (Blanked) ---
        awayTeam: {
            id: "", // string
            name: "", // string
            logo: "", // string (URL/Path)
            coach: "", // string
            formation: "", // string
            side: "", // string ("away")
            players: [], // array (List of player IDs/objects)
            substitutes: [], // array (List of player IDs/objects)
            lineUp: { // map (Formation details)
                formationName: "", // string
                sport: "", // string
                active: [], // array
                positions: {} // map
            },
            stats: [] // array (Team stats like Possession, Shots, etc.)
        },

        // --- Home Team (Blanked) ---
        homeTeam: {
            id: "", // string
            name: "", // string
            logo: "", // string (URL/Path)
            coach: "", // string
            formation: "", // string
            side: "", // string ("home")
            players: [], // array (List of player IDs/objects)
            substitutes: [], // array (List of player IDs/objects)
            lineUp: { // map (Formation details)
                formationName: "", // string
                sport: "", // string
                active: [], // array
                positions: {} // map
            },
            stats: [] // array (Team stats like Possession, Shots, etc.)
        },

        // --- Other Game Data ---
        caption: "", // string
        highlights: "", // string (Text summary/link)
        videoUrl: "", // string (Full game video link)
        videos: [], // array (List of video clip links/objects)
        players: [], // array (List of all player IDs/objects involved)
        allowedUsers: [], // array (List of user IDs allowed to view/edit)
        tags: "", // string (Tags as a single string)
        stats: [], // array (Overall game stats)
        gameEvents: [], // array (Timeline of game events like goals, fouls, substitutions)
        scoreEvents: [], // array (Only events that change the score)

        votes: { // map (User prediction/voting)
            homeVotes: 0, // number
            awayVotes: 0, // number
            drawVotes: 0, // number
            userVotes: {} // map (User ID: vote, e.g., "user123": "home")
        }
    }
};