# Catch Me API Documentation

This document outlines the available API endpoints and background jobs for the Catch Me backend.

- **Base URL**: `https://api.catchme.live/` or `https://api2.catchme.live/` (Production) or `http://localhost:5000/api` (Local)
- **Format**: All requests and responses use JSON.

---

## 1. User Management (`/api/users`)

### Get All Users

- **Method**: `GET`
- **Endpoint**: `/`
- **Description**: Returns a list of all users from Firestore.

### Get User by ID

- **Method**: `GET`
- **Endpoint**: `/:id`
- **Description**: Returns the details of a specific user.

### Delete User

- **Method**: `DELETE`
- **Endpoint**: `/:id`
- **Description**: Deletes a specific user by ID.

### Search Users

- **Method**: `GET`
- **Endpoint**: `/search?q={query}`
- **Description**: Searches for users by name (prefix match) or email.

### Get User Suggestions

- **Method**: `GET`
- **Endpoint**: `/:id/suggestions`
- **Description**: Returns "You May Know" user recommendations for a given user ID.

---

## 2. Events (`/api/events`)

### Get All Events

- **Method**: `GET`
- **Endpoint**: `/`
- **Description**: Returns a list of all events.

### Get Event by ID

- **Method**: `GET`
- **Endpoint**: `/:id`
- **Description**: Returns details for a specific event.

### Delete Event

- **Method**: `DELETE`
- **Endpoint**: `/:id`
- **Description**: Deletes an event by ID.

### Get Events by Type

- **Method**: `GET`
- **Endpoint**: `/:type`
- **Description**: Retrieves events filtered by their type parameter.

---

## 3. Games (`/api/games`)

### Get All Games

- **Method**: `GET`
- **Endpoint**: `/`
- **Description**: Retrieves a list of all games.

### Get Game by ID

- **Method**: `GET`
- **Endpoint**: `/:id`
- **Description**: Retrieves details of a specific game.

### Standardize Game

- **Method**: `POST`
- **Endpoint**: `/:id/standardize`
- **Description**: Standardizes a specific game's data.

### End Game

- **Method**: `POST`
- **Endpoint**: `/:id/end`
- **Description**: Ends a specific game session.

---

## 4. Notifications (`/api/notifications`)

### Send Notification

- **Method**: `POST`
- **Endpoint**: `/send`
- **Description**: Sends a push notification or in-app event. Accepts target tokens, user IDs, or a `sendToAll` flag.

### Send Notification to All Users

- **Method**: `POST`
- **Endpoint**: `/send-all`
- **Description**: Explicit endpoint to send a push notification to all users across the app automatically.

---

## 5. Feed (`/api/feed`)

### Get User Feed

- **Method**: `GET`
- **Endpoint**: `/:id`
- **Description**: Generates a personalized summarized feed for a specific user ID based on recommendations and engagements.
- **Query Parameters**:
  - `filter` (optional): `all`, `followers`, `trending`, `suggested`. Defaults to `all`.
- **Response Features**: Includes categorized `posts`, `games` (IDs), `suggestedUsers`, `upcomingGames` (IDs), and `popular` (categorized IDs).

### Get Granular Feed Component

- **Method**: `GET`
- **Endpoint**: `/:id/:type/:subtype?`
- **Description**: Retrieves a specific, granular component of the feed for a given user. Used to fetch individual segments of the feed (often as arrays of IDs for optimization). Can optionally take a subtype (e.g., `/popular/highlights`).
- **Path Parameters**:
  - `type`: The component to fetch. Supported values: `posts`, `highlights`, `images`, `thoughts`, `games`, `users`, `upcoming`, `popular`.
  - `subtype` (optional): Further filters the type, specifically useful for `posts` or `popular` to get specific categories like `highlights`, `images`, or `thoughts`.
- **Query Parameters**:
  - `filter` (optional): `all`, `followers`, `trending`, `suggested`. Defaults to `all`.

---

## 6. Engagement (`/api/engage`)

### Record Engagement Signal

- **Method**: `POST`
- **Endpoint**: `/signal`
- **Description**: Records user engagement (dwell time, clicks, views, likes, comments, etc.) for a post or game.

---

## 7. Leaderboard (`/api/leaderboard`)

### Get Rankings

- **Method**: `GET`
- **Endpoint**: `/`
- **Description**: Returns a ranked list of users, filterable by query parameters (`role`, `country`, `region`, `location`, `sport`, `limit`, `page`).

---

## 8. Background Jobs & Scheduled Tasks

The backend runs multiple background operations to maintain system health, engagement tracking, and user recommendations.

- **Engagement Flusher (`flushEngagements.js`)**:
  - **Schedule**: Every 30 minutes.
  - **Description**: Flushes temporary in-memory engagement/view data into Firestore. Recalculates weighted engagement scores for posts based on views, likes, comments, shares, and saves.
- **Tag Sync (`tagSync.js`)**:
  - **Schedule**: Daily at midnight.
  - **Description**: Synchronizes tag data systematically across the platform.
- **Compute Similarity (`computeSimilarity.js`)**:
  - **Schedule**: Batch / Nightly job.
  - **Description**: Collaborative filtering task that runs iteratively over users to compute Jaccard Similiary index based on intersecting `likedPosts` helping to fuel recommendations.
- **Calculate Velocity (`calculateVelocity.js`)**:
  - **Schedule**: Batch / Periodic job.
  - **Description**: Analyzes posts from the last 48 hours to determine engagement velocity (change in score per hour). Helpful for identifying trending content.
