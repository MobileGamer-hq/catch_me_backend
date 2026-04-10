# Local Fuzzy Search System Documentation

This document explains the implementation, architecture, and expected output of the high-performance local search system implemented for **Users**, **Posts**, and **Games**.

## 1. Overview & Architecture

The system is designed to provide search results that are **Faster** than Firestore queries and **Fuzzy** (capable of finding "closest matches" even with typos).

### How it works:
1.  **Daily Synchronization**: Once a day, background cron jobs fetch data from Firestore.
2.  **Minification**: Only the fields necessary for search and display (e.g., name, pic, tags) are kept.
3.  **Local Storage**: Data is saved as minified JSON files in `src/data/`.
4.  **In-Memory Search**: When a search request comes in, the backend loads the JSON and uses the `fuse.js` library to perform a weighted fuzzy search across multiple keys (like name, username, and tags).

---

## 2. API Endpoints & Expected Output

### A. User Search
**Endpoint**: `GET /api/users/local-search?q={query}`  
**Keys Searched**: `name`, `username`

**Expected Output**:
```json
[
  {
    "id": "user_abc_123",
    "username": "johndoe",
    "name": "John Doe",
    "profilePic": "https://...",
    "role": "athlete"
  }
]
```

---

### B. Posts Search
**Endpoint**: `GET /api/posts/local-search?q={query}`  
**Keys Searched**: `caption`, `tags`

**Expected Output**:
```json
[
  {
    "id": "post_xyz_789",
    "userId": "user_abc_123",
    "type": "Highlight",
    "caption": "Check out this goal!",
    "tags": ["football", "skill", "goal"],
    "pic": "https://...",
    "name": "John Doe"
  }
]
```

---

### C. Games Search
**Endpoint**: `GET /api/events/local-search?q={query}`  
**Keys Searched**: `title`, `sport`, `tags`

**Expected Output**:
```json
[
  {
    "id": "game_lmn_456",
    "userId": "user_abc_123",
    "sport": "Basketball",
    "title": "Finals: Tigers vs Lions",
    "tags": ["finals", "basketball"],
    "type": "game"
  }
]
```

---

## 3. Implementation Details

### Background Sync Jobs
The following jobs are scheduled in `src/jobs/cron.js`:
-   **Users Sync** (`0 3 * * *`): Runs at 3 AM daily.
-   **Posts Sync** (`0 4 * * *`): Runs at 4 AM daily.
-   **Games Sync** (`0 5 * * *`): Runs at 5 AM daily.

### Fuzzy Search Logic (`fuse.js`)
The `Fuse` configuration is set to a threshold of `0.4`. This provides a balance between accuracy and flexibility:
-   **Exact matches** are always ranked first.
-   **Typos** (e.g., "baskball" for "basketball") will still return a match.
-   **Partial tags** will be picked up even if the full tag isn't typed.

---

## 4. Why use this for Flutter?

1.  **Instant Feedback**: Because the search is performed in the server's memory against a local file, latency is extremely low (typically sub-50ms).
2.  **Typo Tolerance**: Users can find what they want even if they don't know the exact spelling of a username or tag.
3.  **Low Database Cost**: instead of triggering a costly Firestore query for every keystroke, you hit a lightweight local API.

---

### Implementation Tip for Flutter:
In Flutter, use a `TextEditingController` with a listener that calls these endpoints. Use a **Debounce** of 300-500ms to ensure you don't call the API until the user pauses typing.
