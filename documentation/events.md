# Event Routes (`/api/events`)

The Events module manages all scheduled and live events across Catch Me, including matches, tournaments, practices, tryouts, and custom user-created sports events. It also provides high-speed local search and cascading deletion across user associations.

---

## Base Path
```http
/api/events
```

---

## Endpoints

### 1. Get All Events
Retrieves all documents stored in the Firestore `events` collection.

- **Method**: `GET`
- **Path**: `/api/events/`
- **Request Headers**: None required.
- **Query Parameters**: None.
- **Request Body**: None.

#### Responses

- **`200 OK`**: List of all events.
  ```json
  {
    "status": "SUCCESS",
    "data": [
      {
        "id": "event_001",
        "type": "game",
        "sport": "basketball",
        "title": "Summer League Quarterfinal",
        "date": "2026-06-20T18:00:00.000Z",
        "location": "Downtown Sports Arena",
        "userId": "user_host123",
        "data": {
          "players": ["user_1", "user_2"],
          "votes": {
            "userVotes": {
              "user_1": "homeTeam"
            }
          }
        }
      }
    ]
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "status": "FAILED",
    "error": "Failed to get events",
    "details": "Firestore error message"
  }
  ```

---

### 2. Local Fuzzy Search Events / Games
Performs instantaneous in-memory fuzzy search across minified local game and event data (`games_min.json`) with Fuse.js, evaluating `title`, `sport`, and `tags`.

- **Method**: `GET`
- **Path**: `/api/events/local-search`
- **Query Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `q` | `string` | **Yes** | Search keywords for event title, sport, or tag. | `?q=basketball` |
- **Request Body**: None.

#### Responses

- **`200 OK`**:
  ```json
  {
    "status": "SUCCESS",
    "data": [
      {
        "id": "event_001",
        "title": "Summer League Quarterfinal",
        "sport": "basketball",
        "tags": ["summerleague", "playoffs"]
      }
    ]
  }
  ```

- **`400 Bad Request`**:
  ```json
  {
    "status": "FAILED",
    "error": "Missing search query"
  }
  ```

- **`503 Service Unavailable`**: Cache index file not yet synced.
  ```json
  {
    "status": "FAILED",
    "error": "Search index not ready. Please try again later."
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "status": "FAILED",
    "error": "Local search failed"
  }
  ```

---

### 3. Get Event by ID
Retrieves the complete data for a specific event.

- **Method**: `GET`
- **Path**: `/api/events/:id`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Firestore Document ID of the event. | `event_001` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: Event data.
  ```json
  {
    "status": "SUCCESS",
    "id": "event_001",
    "type": "practice",
    "sport": "football",
    "title": "Varsity Open Practice",
    "location": "North Field",
    "userId": "coach_mike",
    "date": "2026-07-01T10:00:00.000Z"
  }
  ```

- **`404 Not Found`**:
  ```json
  {
    "status": "FAILED",
    "error": "Event not found"
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "status": "FAILED",
    "error": "Failed to get event",
    "details": "Error message"
  }
  ```

---

### 4. Delete Event (Cascading Cleanup)
Deletes an event and cleans up all user references in an atomic Firestore batch:
- Removes event ID from users' `events`, `games`, `myCustomEvents`, `myGames`, `feed.events`, and `feed.games` arrays.
- Deletes the primary event document.

- **Method**: `DELETE`
- **Path**: `/api/events/:id`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Firestore Document ID of the event to delete. | `event_001` |
- **Request Body**: None.

#### Responses

- **`200 OK`**:
  ```json
  {
    "status": "SUCCESS",
    "message": "Event and its traces deleted successfully"
  }
  ```

- **`404 Not Found`**:
  ```json
  {
    "status": "FAILED",
    "error": "Event not found"
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "status": "FAILED",
    "error": "Failed to delete event",
    "details": "Batch write failure"
  }
  ```

---

### 5. Get Events by Type
Filters events by their `type` field (e.g., `game`, `practice`, `tournament`, `tryout`).

- **Method**: `GET`
- **Path**: `/api/events/:type`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `type` | `string` | **Yes** | Event category type. | `practice` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: List of events matching the type.
  ```json
  {
    "status": "SUCCESS",
    "data": [
      {
        "id": "event_002",
        "type": "practice",
        "sport": "tennis",
        "title": "Weekend Drill Session",
        "date": "2026-08-12T09:00:00.000Z"
      }
    ]
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "status": "FAILED",
    "error": "Failed to get events by type",
    "details": "Firestore error message"
  }
  ```
