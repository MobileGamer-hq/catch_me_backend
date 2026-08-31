# Leaderboard Routes (`/api/leaderboard`)

The Leaderboard module calculates, ranks, and delivers real-time leaderboards of athletes, teams, and creators based on performance levels, accumulated XP, follower counts, and content contributions. It features a daily cache layer backed by Firebase Realtime Database for fast responses.

---

## Base Path
```http
/api/leaderboard
```

---

## Scoring Formula & Cache Architecture

- **Ranking Score Formula**:
  $$\text{Score} = (\text{Level} \times 100) + \text{XP} + (\text{Followers Count} \times 5) + (\text{Posts Count} \times 2)$$
- **Cache Strategy**: Queries generate composite cache keys (e.g. `role_athlete-country_usa-location_all-region_all-sport_basketball`) stored in Firebase Realtime Database under `/leaderboards/`. Rankings are cached and invalidated daily at midnight.

---

## Endpoints

### 1. Get Ranked Leaderboard
Fetches ranked users matching optional demographic, role, and sport filters with pagination.

- **Method**: `GET`
- **Path**: `/api/leaderboard/`
- **Request Headers**: None required.
- **Query Parameters**:
  | Parameter | Type | Required | Default | Description | Example |
  |---|---|---|---|---|---|
  | `role` | `string` | No | All | User role filter (`athlete`, `coach`, `scout`, `team`, `fan`). | `?role=athlete` |
  | `country` | `string` | No | All | Country name. | `?country=USA` |
  | `location` | `string` | No | All | City or locality. | `?location=Chicago` |
  | `region` | `string` | No | All | Geographical region / state. | `?region=Midwest` |
  | `sport` | `string` | No | All | Sport name (filters user's `favoriteSports`). | `?sport=Basketball` |
  | `limit` | `integer` | No | `50` | Number of results per page. | `?limit=25` |
  | `page` | `integer` | No | `1` | Page number for pagination. | `?page=2` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: Paginated leaderboard.
  ```json
  {
    "data": [
      {
        "id": "user_rank1",
        "name": "Jordan Miller",
        "username": "jmiller23",
        "profilePic": "https://storage.catchme.live/profiles/jmiller.jpg",
        "role": "athlete",
        "country": "USA",
        "location": "Chicago",
        "level": 12,
        "xp": 4580,
        "score": 6280
      },
      {
        "id": "user_rank2",
        "name": "Sarah Connor",
        "username": "sarah_c",
        "profilePic": "https://storage.catchme.live/profiles/sarah.jpg",
        "role": "athlete",
        "country": "USA",
        "location": "Chicago",
        "level": 10,
        "xp": 3920,
        "score": 5320
      }
    ],
    "total": 142,
    "page": 1,
    "limit": 25,
    "totalPages": 6
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Failed to fetch leaderboard"
  }
  ```
