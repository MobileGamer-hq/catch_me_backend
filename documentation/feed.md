# Feed Routes (`/api/feed`)

The Feed module is the recommendation engine for Catch Me. It scores and ranks content based on multi-factor engagement weights, role multipliers, collaborative filtering, freshness decay, user affinity (favorite sports, teams, athletes), and A/B test personalization buckets.

---

## Base Path
```http
/api/feed
```

---

## Algorithm & Personalization Overview

The feed system calculates a composite score for candidate posts and games using:
- **Engagement Multipliers**: Views (1x), Likes (2x), Comments (4x), Saves (5x), Shares (6x).
- **Creator Role Multipliers**: Scouts (2.0x), Coaches (1.5x), Teams (1.2x), Athletes (1.1x), Fans (1.0x).
- **Personalization Affinities**: Bonuses for followed creators (+30), favorite athletes (+50), favorite teams (+40), favorite sports (+20), and hashtag matches (+5).
- **A/B Testing**: Controlled by the `x-session-id` request header.

---

## Endpoints

### 1. Get Complete User Feed
Generates and caches a full personalized feed for the given user ID.

- **Method**: `GET`
- **Path**: `/api/feed/:id`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Target user's Firestore ID. | `user_12345` |
- **Request Headers**:
  | Header | Type | Required | Description |
  |---|---|---|---|
  | `x-session-id` | `string` | Optional | Client session ID used for A/B testing bucket distribution (`A` or `B`). |
- **Query Parameters**:
  | Parameter | Type | Required | Default | Allowed Values | Description |
  |---|---|---|---|---|---|
  | `filter` | `string` | No | `all` | `all`, `followers`, `trending`, `suggested` | Feed selection criteria. |
- **Request Body**: None.

#### Responses

- **`200 OK`**: Complete feed structure returned.
  ```json
  {
    "posts": {
      "highlights": [
        {
          "id": "post_hl_01",
          "userId": "user_scout1",
          "type": "highlight",
          "mediaUrl": "https://storage.catchme.live/videos/hl01.mp4",
          "caption": "Incredible step-back three!",
          "likes": ["user_a", "user_b"],
          "views": 350,
          "finalScore": 142.5
        }
      ],
      "images": [
        {
          "id": "post_img_02",
          "userId": "user_ath02",
          "type": "image",
          "mediaUrl": "https://storage.catchme.live/images/pic02.jpg",
          "caption": "Championship match warmup",
          "likes": ["user_c"],
          "views": 180,
          "finalScore": 98.0
        }
      ],
      "thoughts": [
        {
          "id": "post_th_03",
          "userId": "user_fan03",
          "type": "thought",
          "caption": "Predictions for tonight's finals?",
          "likes": [],
          "views": 45,
          "finalScore": 42.0
        }
      ]
    },
    "games": [
      "game_event_101",
      "game_event_102"
    ],
    "suggestedUsers": [
      {
        "id": "user_sug01",
        "name": "Marcus Smart",
        "username": "msmart",
        "avatar": "https://storage.catchme.live/profiles/msmart.jpg",
        "role": "athlete"
      }
    ],
    "upcomingGames": [
      "game_event_201",
      "game_event_202"
    ],
    "popular": {
      "highlights": [],
      "images": [],
      "thoughts": []
    }
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Failed to fetch user feed"
  }
  ```

---

### 2. Get Granular Feed Component
Retrieves an isolated, optimized segment of the feed (useful for lazy loading tabs, infinite scrolling, or specific views like video highlight carousels).

- **Method**: `GET`
- **Path**: `/api/feed/:id/:type/:subtype?`
- **Path Parameters**:
  | Parameter | Type | Required | Allowed Values | Description |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Any valid user ID | Target user ID. |
  | `type` | `string` | **Yes** | `posts`, `highlights`, `images`, `thoughts`, `games`, `users`, `upcoming`, `popular` | Feed component category. |
  | `subtype` | `string` | No | `highlights`, `images`, `thoughts` | Sub-category (applicable when `type` is `posts` or `popular`). |
- **Request Headers**:
  | Header | Type | Required | Description |
  |---|---|---|---|
  | `x-session-id` | `string` | Optional | Session ID for A/B testing distribution. |
- **Query Parameters**:
  | Parameter | Type | Required | Default | Allowed Values |
  |---|---|---|---|---|
  | `filter` | `string` | No | `all` | `all`, `followers`, `trending`, `suggested` |
- **Request Body**: None.

#### Response Formats by Component Type

##### 1. When `type` = `posts` (without subtype)
Returns object grouped by post types:
```json
{
  "highlights": [ { "id": "p1", "caption": "..." } ],
  "images": [ { "id": "p2", "caption": "..." } ],
  "thoughts": [ { "id": "p3", "caption": "..." } ]
}
```

##### 2. When `type` = `highlights`, `images`, or `thoughts` (or `posts/:subtype`)
Returns flat array of post objects for that specific content type:
```json
[
  {
    "id": "post_hl_01",
    "userId": "user_scout1",
    "type": "highlight",
    "mediaUrl": "https://storage.catchme.live/videos/hl01.mp4",
    "caption": "Top play of the week!",
    "likes": ["user_1"],
    "views": 250,
    "finalScore": 110.5
  }
]
```

##### 3. When `type` = `games` or `upcoming`
Returns array of game/event ID strings:
```json
[
  "game_event_101",
  "game_event_102",
  "game_event_103"
]
```

##### 4. When `type` = `users`
Returns array of suggested user profiles:
```json
[
  {
    "id": "user_sug01",
    "name": "Marcus Smart",
    "username": "msmart",
    "avatar": "https://storage.catchme.live/profiles/msmart.jpg"
  }
]
```

#### Error Responses

- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Failed to fetch granular feed: highlights"
  }
  ```
