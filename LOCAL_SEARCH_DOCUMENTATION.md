# Local Fast Search System Documentation

This document explains the implementation, architecture, and expected output of the high-performance local search system implemented for **Users**, **Posts**, and **Games**.

## 1. Overview & Architecture

The system provides instant, typo-tolerant search results with **Instagram-Style Relevance Ranking** across both `username` and `name` (as well as captions, sports, and tags).

### How it works:
1. **Real-time Synchronization**: Firestore listeners in `src/services/listener.service.js` immediately update the in-memory search index whenever users, posts, or games are created, edited, or deleted.
2. **Startup & Daily Backup Sync**: Background cron jobs (`0 3 * * *`, `0 4 * * *`, `0 5 * * *`) and startup fallback handlers ensure data is continuously refreshed from Firestore into Redis and local disk JSON files.
3. **In-Memory Multi-Tiered Ranking**: Search requests query in-memory data with zero database overhead, applying precise relevance scoring based on exact matches, prefixes, word boundaries, acronyms, and typo tolerance.

---

## 2. Relevance Ranking Engine (Instagram-Style)

When a user searches for any query `q` (e.g. `c`, `cu`, `jason`, `covenant`):

| Priority Tier | Match Type | Description & Example |
| :--- | :--- | :--- |
| **Tier 1 (Top)** | **Exact Match** | Exact match on `username` or full `name` (e.g. query `cu` on username `cu`) |
| **Tier 2** | **Prefix Match** | `username` or `name` starts with query (e.g. query `cu` matches `CUSD`, `CUChancellor's-Cup`) |
| **Tier 3** | **Word-Start Match** | Any word in `name` starts with query (e.g. query `alex` matches name `Jones Alex`, query `kingsley` matches `Duru Kingsley`) |
| **Tier 4** | **Acronym / Initials** | Initials of `name` match query (e.g. query `cu` matches `Covenant University`) |
| **Tier 5** | **Substring Contains** | Query is contained anywhere in `username` or `name` (e.g. query `cu` matches `ElectBasketballTeamCU`) |
| **Tier 6** | **Fuzzy / Typo Tolerance** | For queries $\ge 3$ characters, Fuse.js fuzzy matching handles slight typos (e.g. query `covenent` matches `Covenant`) |

### As-You-Type Search Narrowing:
- **1-Character Queries**: Typing `c` immediately yields accounts starting with `c` (e.g. `CUSD`, `CatchMe`, `Charles`).
- **Narrowing**: Typing `cu` narrows to `CUSD`, `CUChancellor's-Cup`, `ElectBasketballTeamCU`.
- **Exact Specificity**: Typing `cusd` narrows directly to `CUSD`.

---

## 3. API Endpoints & Expected Output

### A. User Search
**Endpoint**: `GET /api/users/local-search?q={query}`  
**Keys Searched**: `username`, `name` (full name, first name, last name, initials)

**Expected Output**:
```json
{
  "status": "SUCCESS",
  "data": [
    {
      "id": "HU9mGUaeJObtZnm8GRFtPH9Dg783",
      "username": "CUSD",
      "name": "",
      "profilePic": "",
      "role": "Sport Fan",
      "verified": false
    },
    {
      "id": "TzjyWeJa4rPOiakdTsK3jh969LA2",
      "username": "CUChancellor's-Cup",
      "name": "Covenant University Chancellor's Cup",
      "profilePic": "",
      "role": "League",
      "verified": false
    },
    {
      "id": "rLe7MBJnWKRhK7fIGRfpLwX7TkH3",
      "username": "ElectBasketballTeamCU",
      "name": "Elect Basketball Team",
      "profilePic": "",
      "role": "Team",
      "verified": false
    }
  ]
}
```

---

### B. Posts Search
**Endpoint**: `GET /api/posts/local-search?q={query}`  
**Keys Searched**: `caption`, `tags`, `name`

**Expected Output**:
```json
{
  "status": "SUCCESS",
  "data": [
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
}
```

---

### C. Games Search
**Endpoint**: `GET /api/events/local-search?q={query}`  
**Keys Searched**: `title`, `sport`, `tags`

**Expected Output**:
```json
{
  "status": "SUCCESS",
  "data": [
    {
      "id": "game_lmn_456",
      "userId": "user_abc_123",
      "sport": "Basketball",
      "title": "Finals: Tigers vs Lions",
      "tags": ["finals", "basketball"],
      "type": "game"
    }
  ]
}
```

---

## 4. Why use this for Flutter?

1. **Instant Feedback**: In-memory response times are typically sub-10ms.
2. **Dynamic As-You-Type Filtering**: Responds on the very first character typed (`q=c`) and narrows fluidly.
3. **No Firestore Read Costs**: Keystrokes hit the fast backend node instead of incurring billing per Firestore read.

---

### Implementation Tip for Flutter:
In Flutter, use a `TextEditingController` with a listener that calls these endpoints. Use a **Debounce** of 200-300ms for smooth UI performance.
