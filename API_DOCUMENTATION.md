# Catch Me API Documentation

This document outlines the available API endpoints and background jobs for the Catch Me backend.

- **Base URL**: `https://api.catchme.live/` or `https://api2.catchme.live/` (Production) or `http://localhost:5000/api` (Local)
- **Format**: All requests and responses use JSON. Every response standardizes on a `status` field: `"SUCCESS"` for 2xx/3xx responses or `"FAILED"` for 4xx/5xx error responses.

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

### Download Athlete Scouting Dossier PDF

- **Method**: `GET`
- **Endpoint**: `/:id/download` (or `/:id/pdf`)
- **Description**: Generates and downloads a complete branded Athlete Scouting Report PDF with physical metrics, level/XP, stats, and profile QR code.

### Export User PDF Link

- **Method**: `POST`
- **Endpoint**: `/:id/export`
- **Description**: Generates and returns a downloadable URL link for the athlete profile PDF.

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

### Download Official Match Verification & Game Sheet PDF

- **Method**: `GET`
- **Endpoint**: `/:id/download`
- **Description**: Generates and streams a match report PDF with Catch Me logo, live game QR code, score, timeline of goals/cards, team rosters, and referee/scouter certification lines.

### Export Game PDF Link

- **Method**: `POST`
- **Endpoint**: `/:id/export`
- **Description**: Generates and returns a downloadable URL link for the game sheet PDF.

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

## 8. QR Code & Link Engine (`/api/qr`)

Provides direct PNG streaming QR codes, JSON Base64 data URLs, and mobile LinkUtils link parsing.

### Generate Raw / Entity QR Code (PNG Image Stream or JSON)

- **Method**: `GET`
- **Endpoint**: `/?url={url}` or `/?type={type}&id={id}`
- **Query Parameters**:
  - `url` (optional): Raw URL to encode.
  - `type` / `id` (optional): Entity type (`profile`, `game`, `lineup`, `stats`, `post`, `challenge`) and target document ID.
  - `format` (optional): `png` (default, binary stream) or `json` (Base64 data URL).
  - `size` (optional): Dimensions in px (default 300).
  - `dark` / `light` (optional): Hex color strings (default `#1E1B4B` and `#FFFFFF`).

### Direct Entity QR Shortcuts (PNG Image Streams)

- `GET /profile/:userId` &rarr; PNG QR code linking to `https://app.catchme.live/profile?id=:userId`
- `GET /game/:gameId` &rarr; PNG QR code linking to `https://app.catchme.live/game?id=:gameId`
- `GET /game/:gameId/lineup` &rarr; PNG QR code linking to `https://app.catchme.live/game?id=:gameId&tab=lineup`
- `GET /game/:gameId/stats` &rarr; PNG QR code linking to `https://app.catchme.live/game?id=:gameId&tab=stats`
- `GET /post/:postId` &rarr; PNG QR code linking to `https://app.catchme.live/post?id=:postId`
- `GET /challenge/:challengeId` &rarr; PNG QR code linking to `https://app.catchme.live/challenge?id=:challengeId`

### Generate QR via JSON Payload

- **Method**: `POST`
- **Endpoint**: `/generate`
- **Body**: `{ "type": "profile", "id": "123", "size": 320 }` or `{ "url": "https://..." }`
- **Description**: Returns JSON with target `link`, Base64 `dataUrl`, and direct CDN `qrImageUrl`.

### Parse & Identify Catch Me Link

- **Method**: `GET` or `POST`
- **Endpoint**: `/parse?link={link}`
- **Description**: Parses query parameters and fragments with Flutter LinkUtils parity to extract entity `type` and `id`.

---

## 9. Scout & Organizer Portal & Export Suite (`/api/scout` & `/api/organizer`)

Tablet-friendly web dashboard and official verification exports.

### Scout & Organizer Tablet Web View

- **Method**: `GET`
- **Endpoint**: `/view` (or `/api/organizer/view` or `/`)
- **Description**: Serves a responsive, tablet-optimized HTML dashboard with date and sport filters, 4 KPI tiles, top performers ranking, disciplinary log (cards), goal scorers timeline, match verification scoreboard cards, and 1-click PDF/CSV export buttons.

### Daily Performance & Match Summary API

- **Method**: `GET`
- **Endpoint**: `/daily-summary`
- **Query Parameters**: `date` (YYYY-MM-DD), `sport`, `tournamentId`.
- **Description**: Returns JSON aggregated match data, top performers with ratings, disciplinary cards, and goal records.

### Export Daily Summary PDF

- **Method**: `GET`
- **Endpoint**: `/daily-summary/pdf`
- **Description**: Streams an official Catch Me branded Daily Summary PDF report with KPI tiles, top performers table, disciplinary card log, goals table, match results, and tournament director sign-off box.

### Export Daily Summary CSV

- **Method**: `GET`
- **Endpoint**: `/daily-summary/csv`
- **Query Parameters**: `date`, `sport`, `tournamentId`, `type` (`all`, `performers`, `cards`).
- **Description**: Generates and streams structured CSV files for spreadsheet verification.

### Export Athlete Scouting Dossier PDF

- **Method**: `GET`
- **Endpoint**: `/profile/:id/pdf` (or `/athlete/:id/pdf`)
- **Description**: Generates an in-depth Athlete Scouting Report PDF containing player demographics, physical metrics (height/weight), level/XP, achievements, verified badge, performance stats, contact & verified social handles, and profile QR code.

---

## 10. Batch Entity Lookups (`/api/batch`)

High-performance Redis-first batch fetching preventing client-side Firestore read spikes.

- **Batch Users**: `POST /api/users/batch` with `{ "ids": ["id1", "id2"] }`
- **Batch Posts**: `POST /api/posts/batch` with `{ "ids": ["id1", "id2"] }`
- **Batch Events**: `POST /api/events/batch` with `{ "ids": ["id1", "id2"] }`
- **Batch Games**: `POST /api/games/batch` with `{ "ids": ["id1", "id2"] }`
- **Multi-Collection Batch**: `POST /api/batch` with `{ "users": [...], "posts": [...], "events": [...], "games": [...] }`

## 11. Data Audit Pipeline & Compliance Suite (`/api/audit`)

Automated weekly data validation pipeline, role-based model constraints enforcement, RTDB issue reporting, and one-time actionable user notification dispatching with failure retry.

### Run Weekly Data Audit

- **Method**: `POST` or `GET`
- **Endpoint**: `/run`
- **Query Parameters**: `dryRun` (`true` | `false`, default: `false`).
- **Description**: Scans user-generated data across Firestore (`users`, `posts`, `events`, `chats`), validates schema & role completion constraints, writes the report to RTDB (`audit_issues/`), and sends one-time notifications to non-compliant users (retrying previously failed deliveries).

### Get Latest Audit Report

- **Method**: `GET`
- **Endpoint**: `/report`
- **Description**: Retrieves the active weekly audit report JSON directly from Firebase Realtime Database (`audit_issues/`).

### Get Audit Notification History

- **Method**: `GET`
- **Endpoint**: `/history`
- **Description**: Returns persistent notification history mapping (`audit_notification_history/`) showing delivered vs failed notification retry statuses.

### Clear Active Audit Report

- **Method**: `DELETE`
- **Endpoint**: `/report`
- **Description**: Clears the active weekly audit report from Realtime Database.

---

## 12. Background Jobs & Scheduled Tasks

The backend runs multiple background operations to maintain system health, engagement tracking, and user recommendations.

- **Weekly Data Audit (`weeklyAudit.js`)**:
  - **Schedule**: Every Sunday at midnight (`0 0 * * 0`).
  - **Description**: Executes comprehensive data integrity audit across primary collections, updates RTDB `audit_issues/`, and notifies non-compliant users with failure retry.
- **Engagement Flusher (`flushEngagements.js`)**:
  - **Schedule**: Every 30 minutes.
  - **Description**: Flushes temporary in-memory engagement/view data into Firestore. Recalculates weighted engagement scores for posts based on views, likes, comments, shares, and saves.
- **Tag Sync (`tagSync.js`)**:
  - **Schedule**: Daily at midnight.
  - **Description**: Synchronizes tag data systematically across the platform.
- **Notification Cleanup (`cleanupNotifications.js`)**:
  - **Schedule**: Daily at 12:00 PM.
  - **Description**: Prunes oldest notifications for users with $\ge 30$ entries.
- **Compute Similarity (`computeSimilarity.js`)**:
  - **Schedule**: Batch / Nightly job.
  - **Description**: Collaborative filtering task that runs iteratively over users to compute Jaccard Similiary index based on intersecting `likedPosts` helping to fuel recommendations.
- **Calculate Velocity (`calculateVelocity.js`)**:
  - **Schedule**: Batch / Periodic job.
  - **Description**: Analyzes posts from the last 48 hours to determine engagement velocity (change in score per hour). Helpful for identifying trending content.

