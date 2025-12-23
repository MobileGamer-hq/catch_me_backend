const postDataModel = {
    // --- Core Metadata ---
    id: "", // string
    userId: "", // string (ID of the user who created the post)
    type: "", // string (e.g., "Highlight", "Post", "Story")
    createdAt: "", // string (Timestamp)
    updatedAt: "", // string (Timestamp)

    // --- Content Data (Now Empty) ---
    data: {}, // map (This was requested to be blank/empty, usually holds content details like caption, URL, etc.)

    // --- Engagement & Social ---
    likes: [], // array (List of user IDs who liked the post)
    comments: [], // array (List of comment IDs/objects)
    tags: [], // array (Relevant keywords/tags)

    // --- Post Settings ---
    allowComments: false, // boolean
    hideLikes: false, // boolean

    // --- User Context Snapshot ---
    userInfo: { // map (Snapshot of user info at the time of creation/viewing)
        name: "", // string
        pic: "", // string (Profile picture URL)
        role: "", // string
        location: "", // string
        verified: false // boolean
    }
};