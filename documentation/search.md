# Global Search Routes (`/api/search`)

The Search module provides unified, multi-entity search across individual users, sports teams, and trending hashtags/topics on Catch Me.

---

## Base Path
```http
/api/search
```

---

## Endpoints

### 1. Global Search
Executes a multi-entity query across usernames, display names, team accounts, and post hashtags.

- **Method**: `GET`
- **Path**: `/api/search/`
- **Request Headers**: None required.
- **Query Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `q` | `string` | **Yes** | Search keyword or query string. | `?q=warriors` |
- **Request Body**: None.

#### Query Behavior & Entity Categorization
1. **Users & Teams**: Searches the `users` Firestore collection by prefix match on `username` and `name`. Results are partitioned into:
   - `users`: Accounts where `role !== 'team'`.
   - `teams`: Accounts where `role === 'team'`.
2. **Hashtags**: Matches tags found within posts, normalizing case and extracting matched keywords.

#### Responses

- **`200 OK`**: Multi-entity search results.
  ```json
  {
    "users": [
      {
        "id": "user_ath01",
        "username": "warrior_jordan",
        "name": "Jordan Miles",
        "profilePic": "https://storage.catchme.live/profiles/jmiles.jpg",
        "role": "athlete",
        "verified": true
      }
    ],
    "teams": [
      {
        "id": "team_gs1",
        "username": "goldenstatewarriors",
        "name": "Golden State Warriors",
        "profilePic": "https://storage.catchme.live/teams/gsw.jpg",
        "role": "team",
        "verified": true
      }
    ],
    "hashtags": [
      {
        "name": "warriors",
        "count": 0
      },
      {
        "name": "warriorsground",
        "count": 0
      }
    ]
  }
  ```

- **`400 Bad Request`**: Missing or empty query parameter `q`.
  ```json
  {
    "error": "Missing search query"
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Search failed",
    "details": "Search query execution failed"
  }
  ```
