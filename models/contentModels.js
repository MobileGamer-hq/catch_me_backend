const postDataModel = {
    // --- Core Metadata ---
    id: "", // string
    userId: "", // string (ID of the user who created the post)
    type: "", // string (e.g., "Highlight", "Image", "Thought")
    createdAt: "", // string (Timestamp)
    updatedAt: "", // string (Timestamp)

    // --- Content Data ---
    data: {}, // map (Content details like caption, URL, sport, etc.)
    
    // --- Engagement & Social ---
    likes: [], // array (List of user IDs who liked the post)
    comments: [], // array (List of comment IDs/objects)
    shares: [], // array (List of user IDs who shared the post)
    saves: [], // array (List of user IDs who saved the post)
    tags: [], // array (Relevant keywords/tags)
    
    // --- Engagement Metrics ---
    engagementScore: 0, // number (Calculated engagement score)
    viewCount: 0, // number (Total views)
    velocity: 0, // number (Engagement velocity - engagements per hour)

    // --- Post Settings ---
    allowComments: false, // boolean
    hideLikes: false, // boolean
    
    // --- Content Classification ---
    sport: "", // string (Sport category if applicable)

    // --- User Context Snapshot ---
    userInfo: { // map (Snapshot of user info at the time of creation/viewing)
        name: "", // string
        pic: "", // string (Profile picture URL)
        role: "", // string
        location: "", // string
        verified: false // boolean
    }
};

module.exports = { postDataModel };
