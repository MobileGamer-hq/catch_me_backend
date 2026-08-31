# Game Routes (`/api/games`)

The Games module manages live sports matches, real-time stat aggregation, standardization of scores across sports (Football, Basketball, Baseball, Tennis, etc.), PDF report generation, and AI-powered match summaries utilizing Google Gemini and xAI Grok.

---

## Base Path
```http
/api/games
```

---

## Endpoints

### 1. Get All Games
Retrieves all match documents from Firestore where `type == "game"`.

- **Method**: `GET`
- **Path**: `/api/games/`
- **Request Headers**: None required.
- **Query Parameters**: None.
- **Request Body**: None.

#### Responses

- **`200 OK`**: List of games.
  ```json
  [
    {
      "id": "game_101",
      "type": "game",
      "sport": "football",
      "title": "Arsenal vs Chelsea",
      "date": "2026-05-10T15:00:00.000Z",
      "location": "Emirates Stadium",
      "currentState": {
        "status": "ongoing",
        "homeScore": 2,
        "awayScore": 1,
        "currentPeriod": 2
      },
      "data": {
        "homeTeam": { "id": "t1", "name": "Arsenal", "players": [] },
        "awayTeam": { "id": "t2", "name": "Chelsea", "players": [] }
      }
    }
  ]
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Failed to fetch games",
    "details": "Error message details"
  }
  ```

---

### 2. Get Game by ID
Fetches full details for a single game event.

- **Method**: `GET`
- **Path**: `/api/games/:id`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Game document ID. | `game_101` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: Game document found.
  ```json
  {
    "id": "game_101",
    "type": "game",
    "sport": "basketball",
    "title": "Lakers vs Warriors",
    "currentState": {
      "status": "ended",
      "homeScore": 112,
      "awayScore": 108
    },
    "data": {
      "homeTeam": { "name": "Lakers", "score": 112 },
      "awayTeam": { "name": "Warriors", "score": 108 },
      "gameEvents": [],
      "scoreEvents": []
    }
  }
  ```

- **`404 Not Found`**: Game not found or event is not of type `game`.
  ```json
  {
    "error": "Game not found"
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Failed to fetch game"
  }
  ```

---

### 3. Standardize Game Data
Recalculates and standardizes player and team statistics (e.g., points, assists, rebounds, yellow cards, shots on target) according to the rules of the game's sport, saving the updated state to Firestore.

- **Method**: `POST`
- **Path**: `/api/games/:id/standardize`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Game document ID. | `game_101` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: Game successfully standardized.
  ```json
  {
    "message": "Game standardized successfully",
    "game": {
      "id": "game_101",
      "updatedAt": "2026-08-28T16:50:00.000Z",
      "currentState": {
        "homeScore": 3,
        "awayScore": 1,
        "status": "ongoing"
      },
      "data": {
        "homeTeam": { "name": "Arsenal", "stats": { "Shots": 14, "Fouls": 8 } },
        "awayTeam": { "name": "Chelsea", "stats": { "Shots": 9, "Fouls": 12 } }
      }
    }
  }
  ```

- **`400 Bad Request`**: Game document missing required fields (`data` or `currentState`).
  ```json
  {
    "error": "Game document is missing required 'data' or 'currentState' fields"
  }
  ```

- **`404 Not Found`**:
  ```json
  {
    "error": "Game not found"
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Failed to standardize game",
    "details": "Standardization error details"
  }
  ```

---

### 4. End Game
Concludes a match by marking its status as `ended` and recording the completion timestamp.

- **Method**: `POST`
- **Path**: `/api/games/:id/end`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Game document ID. | `game_101` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: Updated game object.
  ```json
  {
    "id": "game_101",
    "type": "game",
    "currentState": {
      "status": "ended",
      "homeScore": 88,
      "awayScore": 79
    },
    "updatedAt": "2026-08-28T16:55:00.000Z"
  }
  ```

- **`404 Not Found`**:
  ```json
  {
    "error": "Game not found"
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Failed to end game"
  }
  ```

---

### 5. Export Game PDF Link
Generates an absolute download URL for the game PDF report.

- **Method**: `POST`
- **Path**: `/api/games/:id/export`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Game document ID. | `game_101` |
- **Request Body**: None.

#### Responses

- **`200 OK`**:
  ```json
  {
    "downloadUrl": "http://localhost:5000/api/games/game_101/download"
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Failed to generate download link"
  }
  ```

---

### 6. Download Game PDF Report
Dynamically generates and streams a formatted PDF report containing match headers, team rosters, scores, and event timelines using `pdfmake`.

- **Method**: `GET`
- **Path**: `/api/games/:id/download`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Game document ID. | `game_101` |
- **Response Headers**:
  - `Content-Type`: `application/pdf`
  - `Content-Disposition`: `attachment; filename=game_<id>.pdf`

#### Responses

- **`200 OK`**: Binary PDF stream.
- **`404 Not Found`**: Game not found.
  ```json
  {
    "error": "Game not found"
  }
  ```
- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Failed to generate PDF"
  }
  ```

---

### 7. Create AI Game Summary
Uses **Google Gemini** (with automated fallback to **xAI Grok**) to analyze raw match statistics and event timelines, producing an engaging, factual sports commentary article. The summary is cached in Firebase Realtime Database at `/game_summaries/:id`.

- **Method**: `POST`
- **Path**: `/api/games/:id/summary`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Game document ID. | `game_101` |
- **Request Body**: None.

#### Responses

- **`201 Created` / `200 OK`**:
  ```json
  {
    "summary": "In a thrilling football showdown, Arsenal secured a 2-1 victory over Chelsea at Emirates Stadium. Bukayo Saka broke the deadlock in the 24th minute with a clinical finish into the bottom left corner...",
    "updatedAt": 1756401000000
  }
  ```

- **`404 Not Found`**:
  ```json
  {
    "error": "Game not found"
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Failed to create game summary",
    "details": "API or model generation failure"
  }
  ```

---

### 8. Update AI Game Summary
Regenerates an AI commentary for a game if the previous summary is older than 10 minutes.

- **Method**: `PUT`
- **Path**: `/api/games/:id/summary`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Game document ID. | `game_101` |

#### Responses

- **`200 OK`**: Updated summary.
  ```json
  {
    "summary": "Updated match commentary reflecting the final whistle and latest statistics...",
    "updatedAt": 1756401900000
  }
  ```

- **`400 Bad Request`**: Throttle limit reached (summary was updated less than 10 minutes ago).
  ```json
  {
    "message": "Summary was updated recently. Please wait before updating again.",
    "summary": {
      "summary": "Existing summary text...",
      "updatedAt": 1756401000000
    }
  }
  ```

- **`404 Not Found`**:
  ```json
  {
    "error": "Summary not found. Please create one first."
  }
  ```

---

### 9. Delete AI Game Summary
Removes the cached AI commentary summary from Firebase Realtime Database.

- **Method**: `DELETE`
- **Path**: `/api/games/:id/summary`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Game document ID. | `game_101` |

#### Responses

- **`200 OK`**:
  ```json
  {
    "message": "Game summary deleted successfully"
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Failed to delete game summary",
    "details": "Firebase Realtime DB error"
  }
  ```
