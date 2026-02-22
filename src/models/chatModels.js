const chatDataModel = {
    // --- Core Metadata ---
    id: "", // string (Unique chat ID)
    type: "", // string (e.g., "group", "private", "support")
    section: "", // string (e.g., "general", "archived")

    // --- Content & Activity ---
    lastMessage: "", // string (Text content of the last message)

    // --- Participants & History ---
    members: [], // array (List of user IDs in the chat)
    messages: [] // array (List of message IDs/objects within the chat)
};