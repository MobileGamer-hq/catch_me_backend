# Engagement Routes (`/api/engage`)

The Engagement module captures implicit user feedback signals (dwell time, clicks, views) on posts and game events to power the recommendation and ranking algorithms.

---

## Base Path
```http
/api/engage
```

---

## Endpoints

### 1. Record Engagement Signal
Registers a user interaction signal against a post or game.

- **Method**: `POST`
- **Path**: `/api/engage/signal`
- **Request Headers**:
  - `Content-Type`: `application/json` (Required)
  - `Authorization`: `Bearer <token>` (Optional, user authentication)
- **Request Body**:
  | Field | Type | Required | Default | Description | Example |
  |---|---|---|---|---|---|
  | `type` | `string` | **Yes** | — | Interaction signal type: `'dwell'` or `'click'`. | `"dwell"` |
  | `targetId` | `string` | **Yes** | — | Document ID of the target post or game event. | `"post_12345"` |
  | `value` | `number` / `string` | Conditional | `0` | Dwell duration in **milliseconds** (required when `type` is `'dwell'`). | `4500` |
  | `targetType` | `string` | No | `"post"` | Entity type: `"post"` (updates `posts` collection) or `"game"` (updates `events` collection). | `"post"` |

#### Example Request Body

##### Dwell Time Signal (e.g. 4.5 seconds on post)
```json
{
  "type": "dwell",
  "targetId": "post_abc123",
  "value": 4500,
  "targetType": "post"
}
```

##### Click Signal (e.g. game card clicked)
```json
{
  "type": "click",
  "targetId": "event_game_456",
  "targetType": "game"
}
```

#### Responses

- **`200 OK`**: Signal successfully recorded.
  ```json
  {
    "success": true
  }
  ```

- **`400 Bad Request`**: Missing required fields `targetId` or `type`.
  ```json
  {
    "error": "Missing required fields"
  }
  ```

- **`500 Internal Server Error`**: Database update failure.
  ```json
  {
    "error": "Failed to record signal"
  }
  ```

---

## Database Effects

| Signal Type | Collection Updated | Incremented Fields |
|---|---|---|
| `dwell` | `posts` or `events` | `totalDwellTime` (+value), `dwellCount` (+1) |
| `click` | `posts` or `events` | `clickCount` (+1) |
