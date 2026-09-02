# Catch Me Backend: System Architecture & Technical Specifications

**Version**: 1.0.0  
**Author**: Principal Software Architect & Lead Product Documentarian  
**Runtime**: Node.js (v18+ / v20+ Recommended), Express.js (v4.21.2)  
**Primary Database**: Google Cloud Firestore (Firebase Admin SDK v13.2.0)  
**Realtime & Cache Engine**: Firebase Realtime Database (RTDB) & Redis (`ioredis` v5.9.3 fallback)  
**AI Services**: Google Gemini (`@google/genai` v2.8.0, `@google/generative-ai` v0.24.1) & xAI Grok API Fallback  
**Document Generation**: `pdfmake` (v0.3.8)  
**Fuzzy Search Engine**: `fuse.js` (v7.3.0)  
**Task Scheduling**: `node-cron` (v4.2.1)  

---

## Table of Contents
1. [Executive Summary & Technology Stack](#1-executive-summary--technology-stack)
2. [Project Layout & Directory Hierarchy](#2-project-layout--directory-hierarchy)
3. [Server Entry Point & Middleware Architecture](#3-server-entry-point--middleware-architecture)
4. [Database Architecture & Data Models](#4-database-architecture--data-models)
   - [Firestore Collections & Schema Specifications](#firestore-collections--schema-specifications)
   - [Firebase Realtime Database (RTDB) Schema & Topology](#firebase-realtime-database-rtdb-schema--topology)
   - [Local Minified Search Cache Datastores](#local-minified-search-cache-datastores)
5. [Complete API Route Inventory & Controller Specifications](#5-complete-api-route-inventory--controller-specifications)
   - [User Management Routes (`/api/users`)](#user-management-routes-apiusers)
   - [Feed & Recommendation Routes (`/api/feed`)](#feed--recommendation-routes-apifeed)
   - [Game & Event Management Routes (`/api/games` & `/api/events`)](#game--event-management-routes-apigames--apievents)
   - [Social Engagement Routes (`/api/engage` & `/api/posts`)](#social-engagement-routes-apiengage--apiposts)
   - [Global Search Routes (`/api/search`)](#global-search-routes-apisearch)
   - [Leaderboard & Ranking Routes (`/api/leaderboard`)](#leaderboard--ranking-routes-apileaderboard)
   - [Push & In-App Notification Routes (`/api/notifications`)](#push--in-app-notification-routes-apinotifications)
6. [Core Services Deep Dive](#6-core-services-deep-dive)
   - [Feed Ranking & Recommendation Engine (`feed.service.js`)](#feed-ranking--recommendation-engine-feedservicejs)
   - [AI Commentary & Narrative Engine (`aiService.js`)](#ai-commentary--narrative-engine-aiservicejs)
   - [Game Standardization & Stats Reconciler (`standardization.service.js`)](#game-standardization--stats-reconciler-standardizationservicejs)
   - [Game Finalization & Profile Propagation Engine (`gameFinalization.service.js`)](#game-finalization--profile-propagation-engine-gamefinalizationservicejs)
   - [Real-time Distributed Event Listeners (`listener.service.js`)](#real-time-distributed-event-listeners-listenerservicejs)
   - [Graph Recommendation & Social Network Service (`graph.service.js`)](#graph-recommendation--social-network-service-graphservicejs)
   - [PDF Match Sheet Generator (`pdf.service.js`)](#pdf-match-sheet-generator-pdfservicejs)
7. [Background Cron Jobs & Automation Engine](#7-background-cron-jobs--automation-engine)
8. [Role-Based Access Control (RBAC) & Security Policies](#8-role-based-access-control-rbac--security-policies)
9. [Developer Operations & Deployment Guide](#9-developer-operations--deployment-guide)

---

## 1. Executive Summary & Technology Stack

The **Catch Me Backend** is an event-driven, high-performance Node.js service engineered to power a multi-sport social network and real-time match operations ecosystem. It serves as the authoritative backend for data validation, complex statistical aggregations, intelligent feed generation, collaborative filtering recommendations, AI-powered match journalism, automated notification dispatching, and high-frequency engagement capture.

### Core Architectural Patterns:
- **Layered Controller-Service-Repository**: Express routes route incoming HTTP traffic through formatting middlewares into controllers (`src/controllers/`), which orchestrate domain services (`src/services/`) interacting with persistence wrappers (`src/utils/db.js`).
- **Hybrid Realtime-Firestore Architecture**: Firestore acts as the primary document store for transactional and relational records (`users`, `posts`, `events`, `chats`), while Firebase Realtime Database (RTDB) acts as a high-speed, sub-millisecond pub/sub and state cache for live game summaries, notifications, app popups, and pre-computed leaderboards.
- **Distributed Event Listeners with Locking**: Background database listeners in `src/services/listener.service.js` monitor database mutations (new posts, finished games) with Firestore transaction locks (`system_locks` collection) to prevent race conditions during horizontal scaling.
- **Offline Sync & Standardization**: Handles games tracked offline by client devices, reconciling player metrics, computing team totals, calculating possession, and propagating ratings back to player profiles.

```
                    ┌─────────────────────────┐
                    │      Client (App)       │
                    └───────────┬─────────────┘
                                │ HTTP / HTTPS
                                ▼
                    ┌─────────────────────────┐
                    │  Express.js API Server  │
                    │   (Port 5000 / api2)    │
                    └───────────┬─────────────┘
                                │
       ┌────────────────────────┼────────────────────────┐
       ▼                        ▼                        ▼
┌──────────────┐        ┌──────────────┐        ┌────────────────┐
│  Firestore   │        │ Firebase RTDB│        │  Redis / Local │
│ (Persistence)│        │(Live Cache)  │        │ (Fuzzy Search) │
└──────┬───────┘        └──────┬───────┘        └────────────────┘
       │                       │
       └───────────┬───────────┘
                   ▼
       ┌────────────────────────┐
       │   Listeners & Crons    │
       │(Feed/XP/AI/Stats Sync) │
       └────────────────────────┘
```

---

## 2. Project Layout & Directory Hierarchy

```
catch_me_backend/
├── config/
│   └── permissions.js             # RBAC role permissions mapping
├── data.js                        # Seed & static reference data
├── firestore.indexes.json         # Composite indexes for Firestore queries
├── package.json                   # Dependency definitions & scripts
├── scripts/
│   ├── debug_hash.js              # Hash debugging utility
│   ├── debug_hash_2.js            # Hash debugging utility
│   ├── final_check.js             # Pre-flight migration check script
│   └── migrate_users.js           # Data migration scripts for user schema
├── src/
│   ├── app.js                     # Express application definition & route mounting
│   ├── server.js                  # Entry point: HTTP listener, cron starter, DB listeners
│   ├── config/
│   │   ├── firebase.js            # Firebase Admin SDK initialization (Auth, Firestore, RTDB)
│   │   └── redis.js               # ioredis client with automatic fallback
│   ├── controllers/
│   │   ├── accounts/              # Specialized account controllers
│   │   │   ├── athlete.js
│   │   │   ├── coach.js
│   │   │   ├── league.js
│   │   │   └── team.js
│   │   ├── athletesController.js  # Athlete queries & ratings
│   │   ├── contentController.js   # Content uploads & local fuzzy post search
│   │   ├── engagementController.js# Dwell time and click telemetry
│   │   ├── eventController.js     # Events, challenges, tournaments
│   │   ├── feedController.js      # Main personalized & granular feed endpoints
│   │   ├── gameController.js      # Match stats, standardization, PDF, AI summaries
│   │   ├── leaderboardController.js# Filtered rankings
│   │   ├── notificationController.js# Push and broadcast dispatchers
│   │   ├── postController.js      # Post deletion & management
│   │   ├── scouterController.js   # Scouter prospects and notes
│   │   ├── searchController.js    # Global federated search
│   │   ├── social/
│   │   │   ├── engagementContoroller.js
│   │   │   └── socialController.js
│   │   └── userController.js      # User CRUD, fuzzy search, "You May Know"
│   ├── data/                      # Local JSON indexes for instant fuzzy search
│   │   ├── games_min.json
│   │   ├── posts_min.json
│   │   └── users_min.json
│   ├── database/                  # In-memory transient engagement buffers
│   │   ├── tempEngagementScores.json
│   │   └── tempViewScores.json
│   ├── jobs/                      # Scheduled maintenance & analytics jobs
│   │   ├── calculateVelocity.js   # Engagement rate per hour
│   │   ├── calculateXP.js         # Daily XP & level recalculation
│   │   ├── cleanupNotifications.js# Prunes notifications > 30 items
│   │   ├── computeSimilarity.js   # Collaborative filtering via Jaccard index
│   │   ├── cron.js                # Master cron orchestrator
│   │   ├── flushEngagements.js    # Flushes temp JSON scores into Firestore
│   │   ├── syncMinGames.js        # Syncs minified games index
│   │   ├── syncMinPosts.js        # Syncs minified posts index
│   │   ├── syncMinUsers.js        # Syncs minified users index
│   │   └── tagSync.js             # Aggregates system-wide hashtags
│   ├── middleware/
│   │   ├── responseFormatter.js   # Standardizes output to { status: "SUCCESS" | "FAILED" }
│   │   └── sessionContext.js      # Injects A/B testing bucket context from headers
│   ├── models/                    # Data models & schema references
│   │   ├── chatModels.js
│   │   ├── contentModels.js
│   │   ├── eventModels.js
│   │   └── userModels.js
│   ├── routes/                    # Express Router definitions
│   │   ├── accountRoutes.js
│   │   ├── contentRoutes.js
│   │   ├── engagementRoutes.js
│   │   ├── eventRoutes.js
│   │   ├── feedRoutes.js
│   │   ├── gameRoutes.js
│   │   ├── leaderboardRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── postRoutes.js
│   │   ├── roleRoutes.js
│   │   ├── searchRoutes.js
│   │   ├── tournamentRoutes.js
│   │   ├── userRoutes.js
│   │   └── verificationRoutes.js
│   ├── services/                  # Business logic services
│   │   ├── aiService.js           # Gemini & Grok AI commentator service
│   │   ├── athlete.service.js
│   │   ├── feed.legacy.js         # Feed orchestrator interface
│   │   ├── feed.service.js        # Advanced ranking, scoring, and diversity engine
│   │   ├── game.service.js
│   │   ├── game.system.js
│   │   ├── gameFinalization.service.js # Match stat aggregation & profile update
│   │   ├── graph.service.js       # Social graph traversal & suggestions
│   │   ├── hashtag.service.js
│   │   ├── leaderboard.service.js # Cached multi-filter leaderboard engine
│   │   ├── league.service.js
│   │   ├── linkUtilities.js       # Deep link builder for games and posts
│   │   ├── listener.service.js    # Realtime Firestore listeners & hybrid fan-out
│   │   ├── notification.service.js# In-app and push notification builder
│   │   ├── notificationService.js # Multicast Firebase Cloud Messaging dispatcher
│   │   ├── pdf.service.js         # PDF generation service using pdfmake
│   │   ├── scouter.service.js
│   │   ├── search.service.js      # Prefix and hashtag search engine
│   │   ├── standardization.service.js # Sport-specific stat reconciler
│   │   └── tag.service.js         # Tag cataloging and ranking
│   └── utils/
│       ├── cache.js               # Redis / Memory cache abstraction
│       └── db.js                  # Firestore & Realtime Database helper wrappers
```

---

## 3. Server Entry Point & Middleware Architecture

### Application Bootstrapping (`src/server.js` & `src/app.js`)

When the server boots:
1. `dotenv.config()` loads environment variables.
2. `src/config/firebase.js` initializes `admin.initializeApp` using service account certificates and sets up references to `Firestore`, `Realtime Database`, and `Auth`.
3. `src/server.js` imports `src/jobs/cron.js`, initializing all periodic schedules.
4. Real-time background listeners are invoked (`watchPosts()`, `watchGames()`, `watchEvents()`).
5. Express binds to `PORT` (default `5000`).

### Middleware Pipeline

```
Incoming Request
      │
      ▼
1. CORS Middleware (Origins: app.catchme.live, localhost:3000, localhost:5000)
      │
      ▼
2. express.json() (Parses application/json request payloads)
      │
      ▼
3. responseFormatter (Intercepts res.json, injects status: "SUCCESS" | "FAILED")
      │
      ▼
4. sessionContext (Extracts x-session-id, calculates deterministic A/B bucket 'A' | 'B')
      │
      ▼
5. Express Routers (/api/users, /api/feed, /api/games, /api/events, etc.)
      │
      ▼
6. 404 Catch-All & Global Error Handler (Formats unhandled exceptions)
```

#### Detailed Middleware Specifications:
1. **Response Formatter (`src/middleware/responseFormatter.js`)**:
   Overrides `res.json` to enforce standard schema contracts:
   - For HTTP Status Codes `200..399`: Ensures top-level `status: "SUCCESS"`. If the controller returned an array or primitive, it nests it under `{ status: "SUCCESS", data: ... }`.
   - For HTTP Status Codes `400..599`: Ensures top-level `status: "FAILED"` with an `error` message string.
2. **Session Context Middleware (`src/middleware/sessionContext.js`)**:
   Reads `x-session-id` header (or defaults). Deterministically assigns `req.sessionContext = { sessionId, bucket: 'A' | 'B', timestamp }` using `sessionId.charCodeAt(0) % 2 === 0 ? "A" : "B"`. This powers A/B feed ranking weight variations.

---

## 4. Database Architecture & Data Models

### Firestore Collections & Schema Specifications

Catch Me utilizes Cloud Firestore as its primary ACID document database.

#### 1. Collection: `users`
Key: `userId` (Firebase Auth UID string)

```javascript
{
  id: "UID_STRING",
  username: "johndoe",
  email: "john@example.com",
  name: "John Doe",
  gender: "Male",
  dob: "2005-04-12",
  age: 21,
  country: "United States",
  location: "Austin, TX",
  bio: "Point Guard Class of 2026",
  profilePic: "https://firebasestorage.googleapis.com/.../profile.jpg",
  role: "athlete", // "fan" | "athlete" | "coach" | "scout" | "team" | "league"
  verified: true,
  requestVerification: false,
  createdAt: "2026-01-01T12:00:00.000Z",
  updatedAt: "2026-08-30T19:00:00.000Z",
  fcmToken: "eXAMPLE_fcm_tOKEN...",
  
  // Social Graph
  followers: ["user_id_1", "user_id_2"],
  following: ["user_id_3", "team_id_1"],
  chats: ["chat_id_1"],
  blockedUsers: [],
  
  // Content Arrays
  posts: ["post_id_1", "post_id_2"],
  imagePost: ["post_id_1"],
  highlights: ["post_id_2"],
  story: [],
  thoughts: [],
  archivedPosts: [],
  likedPosts: ["post_id_99"],
  savedPosts: [],
  
  // Sports & Interests
  tags: ["#basketball", "#pointguard", "#classof2026"],
  interestedTags: ["#nba", "#handles"],
  interestedSports: ["basketball", "football"],
  favoriteSports: ["basketball"],
  interestedTeams: ["team_id_1"],
  favoriteTeams: ["team_id_1"],
  interestedAthletes: ["user_id_3"],
  favoriteAthletes: ["user_id_3"],
  
  // Physical Attributes
  height: { unit: "cm", value: 188 },
  weight: { unit: "kg", value: 82 },
  
  // Gamification
  level: "starter", // "rookie" | "prospect" | "starter" | "allStar" | "mvp" | "goat"
  experiencePoints: 5200,
  xp: 5200,
  nextLevelXP: 20000,
  achievements: ["first_game_recorded", "100_followers"],
  
  // Sub-role Data
  roleData: {
    // For Athlete:
    dominant: "Right",
    position: "PG",
    number: "7",
    teamId: "team_id_1",
    schoolId: "school_id_1",
    performanceStats: [{ label: "Points", value: 24 }, { label: "Assists", value: 8 }]
  },
  
  // Events & Schedules
  games: ["game_id_1"],
  myGames: ["game_id_1"],
  challenges: [],
  myChallenges: [],
  pendingChallenges: [],
  tournaments: [],
  myTournaments: [],
  customEvents: [],
  myCustomEvents: [],
  schedule: [],
  seasons: [],
  
  // Notifications Array (In-document array for fast access)
  notifications: [
    {
      id: "notif_id_1",
      senderId: "user_id_3",
      recipientId: "UID_STRING",
      title: "Coach Smith made a new post!",
      body: { type: "post", fromUser: "user_id_3" },
      sentAt: 1725048000000,
      link: "https://catchme.live/post?id=post_id_2"
    }
  ],
  
  // Settings & Flags
  flags: {
    banned: false,
    banReason: "",
    warnings: 0,
    reportsAgainst: []
  },
  settings: {
    darkMode: true,
    language: "en",
    privateProfile: false,
    showAge: true,
    showLocation: true,
    allowMessagesFrom: "everyone",
    pushNotifications: {
      likes: true,
      comments: true,
      follows: true,
      messages: true
    }
  }
}
```

#### 2. Collection: `posts`
Key: `postId` (Firestore generated or custom UID string)

```javascript
{
  id: "post_id_1",
  userId: "user_uid_123",
  type: "highlight", // "highlight" | "image" | "thought"
  createdAt: "2026-08-30T18:00:00.000Z",
  updatedAt: "2026-08-30T18:00:00.000Z",
  data: {
    caption: "Game winning step-back three in the district finals!",
    videoUrl: "https://firebasestorage.googleapis.com/.../highlight.mp4",
    thumbnailUrl: "https://firebasestorage.googleapis.com/.../thumb.jpg",
    sport: "basketball",
    duration: 15.4
  },
  likes: ["user_uid_456", "user_uid_789"],
  comments: ["comment_id_1"],
  shares: ["user_uid_999"],
  saves: ["user_uid_456"],
  tags: ["#basketball", "#gamewinner", "#clutch"],
  
  // Engagement Scoring Fields (Calculated by Jobs & Services)
  engagementScore: 42,
  viewCount: 150,
  velocity: 4.5, // Engagements per hour
  engagementHistory: [
    { timestamp: 1725044400000, score: 10 },
    { timestamp: 1725048000000, score: 42 }
  ],
  
  // Telemetry Metrics
  totalDwellTime: 450000, // in milliseconds
  dwellCount: 45,
  clickCount: 60,
  
  // Content Flags
  allowComments: true,
  hideLikes: false,
  sport: "basketball",
  
  // Denormalized author snapshot
  userInfo: {
    name: "John Doe",
    pic: "https://firebasestorage.googleapis.com/.../profile.jpg",
    role: "athlete",
    location: "Austin, TX",
    verified: true
  }
}
```

#### 3. Collection: `events` (Games, Tournaments, Custom Events)
Key: `eventId` (String)

```javascript
{
  id: "game_event_123",
  userId: "coach_uid_1",
  type: "game", // "game" | "tournament" | "challenge" | "custom"
  sport: "football",
  title: "Varsity Cup Final: Eagles vs Lions",
  location: "National Stadium Field A",
  date: "2026-08-30",
  time: "19:30",
  duration: 90,
  periods: 2,
  isTeamGame: true,
  createdAt: "2026-08-30T10:00:00.000Z",
  updatedAt: "2026-08-30T21:15:00.000Z",
  
  // Real-time Match State
  currentState: {
    status: "completed", // "scheduled" | "live" | "paused" | "finished" | "completed"
    period: 2,
    homeScore: 3,
    awayScore: 1,
    timeLeft: 0
  },
  
  // Detailed Match Data Container
  data: {
    homeTeam: {
      id: "team_eagles_id",
      name: "Westlake Eagles",
      logo: "https://.../eagles.png",
      coach: "Coach Smith",
      formation: "4-3-3",
      side: "home",
      players: [
        {
          id: "player_1",
          name: "Alex Hunter",
          number: "9",
          stats: { Gls: 2, Sht: 5, ShtTarget: 3, Tkl: 1 }
        }
      ],
      substitutes: [],
      lineUp: {
        formationName: "4-3-3",
        sport: "football",
        active: [0, 1, 2],
        positions: {
          "pos_0": { id: "0.5-0.1", position: "ST", x: 0.5, y: 0.1, playerIndex: 0 }
        }
      },
      stats: [
        { label: "Possession %", value: 58 },
        { label: "Shots", value: 12 },
        { label: "Yellow Cards", value: 1 }
      ]
    },
    awayTeam: {
      id: "team_lions_id",
      name: "Northview Lions",
      logo: "https://.../lions.png",
      coach: "Coach Davis",
      formation: "4-4-2",
      side: "away",
      players: [],
      substitutes: [],
      lineUp: {},
      stats: [
        { label: "Possession %", value: 42 },
        { label: "Shots", value: 7 },
        { label: "Yellow Cards", value: 2 }
      ]
    },
    
    // Timeline of Action Events
    gameEvents: [
      {
        id: "evt_1",
        type: "goal",
        playerId: "player_1",
        playerName: "Alex Hunter",
        teamId: "team_eagles_id",
        assistPlayerId: "player_2",
        minute: 23,
        timestamp: 1725049500000
      }
    ],
    
    // Post-Finalization Computed Stats
    playerStats: [
      {
        id: "player_1",
        name: "Alex Hunter",
        goals: 2,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        rating: 9.2
      }
    ],
    stats: [
      { label: "Total Goals", value: 4 },
      { label: "Total Events", value: 14 }
    ],
    
    // Fan Voting
    votes: {
      homeVotes: 142,
      awayVotes: 89,
      drawVotes: 23,
      userVotes: { "user_uid_123": "home" }
    }
  },
  
  // UI Structured Summary
  summary: {
    finalScore: "3 - 1",
    gameDate: "2026-08-30",
    matchup: "Westlake Eagles vs Northview Lions",
    homeTeam: { id: "team_eagles_id", name: "Westlake Eagles", score: 3 },
    awayTeam: { id: "team_lions_id", name: "Northview Lions", score: 1 },
    topPerformers: [{ id: "player_1", name: "Alex Hunter", rating: 9.2 }]
  }
}
```

#### 4. Collection: `chats`
```javascript
{
  id: "chat_123",
  type: "private", // "private" | "group" | "team"
  members: ["user_1", "user_2"],
  lastMessage: "See you at practice tomorrow!",
  updatedAt: "2026-08-30T18:45:00.000Z",
  messages: ["msg_1", "msg_2"]
}
```

---

### Firebase Realtime Database (RTDB) Schema & Topology

Catch Me uses the Firebase Realtime Database (`https://catch-me-beta-dcff0-default-rtdb.firebaseio.com/`) for low-latency push state and temporary computed structures.

| RTDB Path | Purpose | Structure |
|---|---|---|
| `game_summaries/{gameId}` | AI commentary articles generated by Gemini / Grok | `{ summary: string, updatedAt: timestamp }` |
| `notifications/{userId}` | Live WebSocket notification feed for user | Child list of `{ id, title, link, status: 'unread', createdAt }` |
| `leaderboards/{cacheKey}` | Daily pre-computed leaderboard rankings | `{ lastUpdated: ISOString, rankings: AthleteRank[] }` |
| `feed/{userId}` | Pre-rendered serialized feed snapshot | `{ data: { posts, games, suggestedUsers, upcomingGames } }` |
| `app_events/{eventId}` | Global marketing / system in-app modal triggers | `{ isActive: boolean, title, body, imageUrl, targetRole }` |
| `push-notifications/` | Audit log of successful FCM push deliveries | List of `{ resolvedTokens, sentAt, fcmResponse }` |
| `failed-push-notifications/` | Log of failed FCM delivery attempts | List of `{ payload, error, failedAt }` |

---

### Local Minified Search Cache Datastores

To provide instant prefix and fuzzy searching without incurring high Firestore query costs and latency, background cron jobs maintain minified JSON datastores in `src/data/`:
- `src/data/users_min.json`: Map of `userId -> { username, name, data: { id, username, name, profilePic, role } }`
- `src/data/posts_min.json`: Map of `postId -> { caption, tags, data: { id, caption, tags, sport, userId, thumbnailUrl } }`
- `src/data/games_min.json`: Map of `gameId -> { title, sport, data: { id, title, sport, homeTeam, awayTeam } }`

`Fuse.js` runs memory searches against these datasets with `threshold: 0.4` and `distance: 100`.

---

## 5. Complete API Route Inventory & Controller Specifications

All responses follow the `responseFormatter` wrapper:
```json
{
  "status": "SUCCESS",
  "data": ...
}
```
Or in error cases:
```json
{
  "status": "FAILED",
  "error": "Detailed error message"
}
```

### User Management Routes (`/api/users`)
*Router*: `src/routes/userRoutes.js` | *Controller*: `src/controllers/userController.js`

| Method | Endpoint | Description | Auth Req | Request Body / Query | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/users` | Fetch all users | Optional | None | `{ status: "SUCCESS", data: MyUser[] }` |
| `GET` | `/api/users/:id` | Fetch specific user document by ID | Optional | `params: { id }` | `{ status: "SUCCESS", ...MyUser }` |
| `DELETE`| `/api/users/:id` | Deep clean & delete user and all traces (followers, posts, events, chats) | Bearer Token | `params: { id }` | `{ status: "SUCCESS", message: "User and all their traces deleted successfully" }` |
| `GET` | `/api/users/search` | Prefix search via Firestore where queries | Optional | `query: { q: string }` | `{ status: "SUCCESS", data: MyUser[] }` |
| `GET` | `/api/users/local-search`| Instant fuzzy search using `users_min.json` and Fuse.js | Optional | `query: { q: string }` | `{ status: "SUCCESS", data: MinUser[] }` |
| `GET` | `/api/users/:id/suggestions`| Graph-based "You May Know" mutual follower suggestions | Optional | `params: { id }` | `{ status: "SUCCESS", data: [{ id, name, username, avatar, mutualCount }] }` |

---

### Feed & Recommendation Routes (`/api/feed`)
*Router*: `src/routes/feedRoutes.js` | *Controller*: `src/controllers/feedController.js`

| Method | Endpoint | Description | Auth Req | Request Body / Query | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/feed/:id` | Generate personalized mixed feed for user | Optional | `params: { id }`, `query: { filter: 'all'\|'followers'\|'trending'\|'suggested' }`, `header: { x-session-id }` | `{ status: "SUCCESS", posts: { highlights: [], images: [], thoughts: [] }, games: string[], suggestedUsers: [], upcomingGames: string[], popular: {} }` |
| `GET` | `/api/feed/:id/:type/:subtype?`| Granular feed retrieval for high-performance lazy loading | Optional | `params: { id, type, subtype }` (`type`: `posts`, `highlights`, `images`, `thoughts`, `games`, `users`, `upcoming`, `popular`) | `{ status: "SUCCESS", data: string[] \| object[] }` |

---

### Game & Event Management Routes (`/api/games` & `/api/events`)
*Routers*: `src/routes/gameRoutes.js`, `src/routes/eventRoutes.js` | *Controllers*: `src/controllers/gameController.js`, `src/controllers/eventController.js`

| Method | Endpoint | Description | Auth Req | Request Body / Query | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/games` | Retrieve all events where `type == 'game'` | Optional | None | `{ status: "SUCCESS", data: Game[] }` |
| `GET` | `/api/games/:id` | Retrieve single game by ID | Optional | `params: { id }` | `{ status: "SUCCESS", ...Game }` |
| `POST`| `/api/games/:id/standardize`| Re-compute team score totals and stats from roster metrics | Optional | `params: { id }` | `{ status: "SUCCESS", message: "...", game: Game }` |
| `POST`| `/api/games/:id/end` | Update game status to ended | Optional | `params: { id }` | `{ status: "SUCCESS", ...Game }` |
| `POST`| `/api/games/:id/export` | Generate streaming link for PDF match report | Optional | `params: { id }` | `{ status: "SUCCESS", downloadUrl: string }` |
| `GET` | `/api/games/:id/download`| Stream rendered PDF binary buffer (`application/pdf`) | Optional | `params: { id }` | PDF File Stream (`game_{id}.pdf`) |
| `POST`| `/api/games/:id/summary`| Generate or fetch AI sports commentary (Gemini/Grok) | Optional | `params: { id }` | `{ status: "SUCCESS", summary: string, updatedAt: number }` |
| `PUT` | `/api/games/:id/summary`| Refresh AI commentary if older than 10 minutes | Optional | `params: { id }` | `{ status: "SUCCESS", summary: string, updatedAt: number }` |
| `DELETE`|`/api/games/:id/summary`| Remove cached summary from Realtime Database | Optional | `params: { id }` | `{ status: "SUCCESS", message: "..." }` |
| `GET` | `/api/events` | Retrieve all events across all types | Optional | None | `{ status: "SUCCESS", data: Event[] }` |
| `GET` | `/api/events/local-search`| Fuzzy search for games using `games_min.json` | Optional | `query: { q: string }` | `{ status: "SUCCESS", data: MinGame[] }` |
| `GET` | `/api/events/:id` | Get specific event by ID | Optional | `params: { id }` | `{ status: "SUCCESS", ...Event }` |
| `DELETE`|`/api/events/:id` | Delete event document | Optional | `params: { id }` | `{ status: "SUCCESS", message: "..." }` |
| `GET` | `/api/events/:type` | Filter events by type (`tournament`, `challenge`, `custom`) | Optional | `params: { type }` | `{ status: "SUCCESS", data: Event[] }` |

---

### Social Engagement Routes (`/api/engage` & `/api/posts`)
*Routers*: `src/routes/engagementRoutes.js`, `src/routes/postRoutes.js` | *Controllers*: `src/controllers/engagementController.js`, `src/controllers/postController.js`, `src/controllers/contentController.js`

| Method | Endpoint | Description | Auth Req | Request Body / Query | Response Structure |
|---|---|---|---|---|---|
| `POST`| `/api/engage/signal` | Log telemetry dwell time or click interaction | Optional | `{ type: "dwell"\|"click", targetId: string, targetType: "post"\|"game", value: number }` | `{ status: "SUCCESS", message: "Signal recorded successfully" }` |
| `GET` | `/api/posts/local-search`| Local fuzzy search on caption and tags via `posts_min.json` | Optional | `query: { q: string }` | `{ status: "SUCCESS", data: MinPost[] }` |
| `GET` | `/api/posts/:id` | Fetch post feed item | Optional | `params: { id }` | `{ status: "SUCCESS", ...Post }` |
| `DELETE`|`/api/posts/:id` | Delete post by ID | Optional | `params: { id }` | `{ status: "SUCCESS", message: "..." }` |

---

### Global Search Routes (`/api/search`)
*Router*: `src/routes/searchRoutes.js` | *Controller*: `src/controllers/searchController.js`

| Method | Endpoint | Description | Auth Req | Request Body / Query | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/search` | Federated search over users, teams, and hashtags | Optional | `query: { q: string }` | `{ status: "SUCCESS", data: { users: [], teams: [], hashtags: [] } }` |

---

### Leaderboard & Ranking Routes (`/api/leaderboard`)
*Router*: `src/routes/leaderboardRoutes.js` | *Controller*: `src/controllers/leaderboardController.js`

| Method | Endpoint | Description | Auth Req | Request Body / Query | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/leaderboard` | Get ranked leaderboard with RTDB daily caching and pagination | Optional | `query: { role, country, location, region, sport, limit: 50, page: 1 }` | `{ status: "SUCCESS", data: { data: AthleteRank[], total: number, page: number, limit: number, totalPages: number } }` |

---

### Push & In-App Notification Routes (`/api/notifications`)
*Router*: `src/routes/notificationRoutes.js` | *Controller*: `src/controllers/notificationController.js`

| Method | Endpoint | Description | Auth Req | Request Body / Query | Response Structure |
|---|---|---|---|---|---|
| `POST`| `/api/notifications/send` | Send push notification via token list or user ID list | Optional | `{ userIds?: string[], tokens?: string[], notification: { title, body }, data?: object }` | `{ status: "SUCCESS", data: FCMResponse }` |
| `POST`| `/api/notifications/send-all`| Broadcast push notification to all registered FCM device tokens | Optional | `{ notification: { title, body }, data?: object }` | `{ status: "SUCCESS", data: FCMResponse }` |

---

### Data Audit & Compliance Routes (`/api/audit`)
*Router*: `src/routes/auditRoutes.js` | *Controller*: `src/controllers/auditController.js`

| Method | Endpoint | Description | Auth Req | Request Body / Query | Response Structure |
|---|---|---|---|---|---|
| `POST` / `GET` | `/api/audit/run` | Execute weekly data audit across users, posts, events, chats | Optional | `query: { dryRun?: boolean }` | `{ status: "SUCCESS", message: "...", meta: {...}, malformed_ids: {...}, incomplete_users: {...}, flagged_content: {...}, relational_anomalies: {...} }` |
| `GET` | `/api/audit/report` | Fetch latest active weekly audit report from Realtime Database | Optional | None | `{ status: "SUCCESS", meta: {...}, malformed_ids: {...}, ... }` |
| `GET` | `/api/audit/history` | Retrieve user notification history with delivered vs failed retry status | Optional | None | `{ status: "SUCCESS", data: { [userId]: { status, sentAt, ... } } }` |
| `DELETE`| `/api/audit/report` | Delete and clear current weekly audit report from Realtime Database | Optional | None | `{ status: "SUCCESS", message: "Audit report deleted..." }` |

---

## 6. Core Services Deep Dive

### Feed Ranking & Recommendation Engine (`src/services/feed.service.js`)

The Feed Recommendation Engine calculates personalized scores for hundreds of candidate posts and games using a multi-factor formula.

```
                    ┌─────────────────────────┐
                    │    Candidate Fetch      │
                    │ (Followers, Sports, Hot)│
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │     Scoring Engine      │
                    │ Global Factor (60%)     │
                    │ Personalization (40%)   │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   Quality Thresholds    │
                    │ (Min views & engagement)│
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │    Diversity Control    │
                    │(Max 3/author, 5/sport)  │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ Categorize & Deliver    │
                    │(Highlights/Image/Thought│
                    └─────────────────────────┘
```

#### The Mathematical Scoring Formula:
$$\text{FinalScore} = (\text{GlobalScore} \times 0.6) + (\text{PersonalScore} \times 0.4)$$

Where:
$$\text{GlobalScore} = \left( \frac{\log_{10}(1 + \text{BaseEngagement})}{\text{TimeDecayFactor}} \right) \times \text{VelocityBoost} \times \text{ColdStartBoost} \times \text{TrustMultiplier}$$

1. **Base Engagement**:
   $$\text{BaseEngagement} = (\text{views} \times 1) + (\text{likes} \times 2) + (\text{comments} \times 4) + (\text{shares} \times 6) + (\text{saves} \times 5)$$
   *(If Session Bucket is `B`, shares are boosted by an additional $+2$ per share for A/B testing)*
2. **Logarithmic Scaling**: $\log_{10}(1 + \text{BaseEngagement})$ compresses exponential viral outliers so 10,000 likes does not starve out newer quality posts.
3. **Time Decay**:
   $$\text{TimeDecayFactor} = \max\left(1, \frac{\text{AgeInHours}}{24}\right)$$
4. **Velocity Boost**:
   $$\text{VelocityBoost} = \min\left(2.0, 1 + \frac{\text{Velocity}}{10}\right)$$
   Where velocity is recent engagements per hour calculated by `calculateVelocity.js`.
5. **Cold Start Boost**:
   For accounts younger than 30 days and posts $\le 5$:
   $$\text{ColdStartBoost} = 2.0 - (\text{postCount} \times 0.2)$$
6. **Trust & Quality Multiplier**:
   - Verified Badge: $\times 1.5$
   - Role Multipliers: Scout ($\times 2.0$), Coach ($\times 1.5$), Team ($\times 1.2$), Athlete ($\times 1.1$), Fan ($\times 1.0$)
   - Account Age $> 365$ days: $\times 1.1$
   - Follower Bonus: $\times (1 + \frac{\log_{10}(1 + \text{Followers})}{10})$
   - Warnings Penalty: $\times 0.8$
   - Shadow-banned: $\times 0.1$ | Banned: $\times 0.0$
7. **Personalization Score**:
   - Author is followed: $+30$ points
   - Author is favorite athlete: $+50$ points
   - Author is favorite team: $+40$ points
   - Matching favorite sport: $+20$ points
   - Matching interested sport: $+10$ points
   - Each matching tag: $+5$ points
   - Previously liked similar content: $+15$ points
   - Previously saved similar content: $+20$ points
8. **Diversity & Saturation Filter**:
   - Caps author representation: Max 3 posts per creator in the top 20 items.
   - Caps category dominance: Max 5 consecutive posts from the same sport.
   - Applies exponential decay $\text{Penalty} = 0.9^k$ for repeated author appearances.

---

### AI Commentary & Narrative Engine (`src/services/aiService.js`)

Generates automated sports journalism for matches:
1. **Primary Model**: Google Gemini (`gemini-3.5-flash` via `@google/genai`).
2. **Automatic Failover**: If the Gemini API hits quotas or errors, the service automatically fails over to xAI's Grok API (`model: "grok-4.3"`) via Axios with Bearer token authentication.
3. **Prompt Engineering**: Ingests the complete JSON match sheet (final score, periods, rosters, key performers, timeline events including goals, assists, cards, substitutions) and instructs the model to act as an expert sports commentator following strict factual constraints without hallucinating events.
4. **Caching**: Writes generated summaries to RTDB at `game_summaries/{gameId}` with a 10-minute cooldown on regeneration.

---

### Game Standardization & Stats Reconciler (`src/services/standardization.service.js`)

Standardizes game stats across 8 supported sports:
- **Football (Soccer)**: Maps player `Gls`, `Sht`, `ShtTarget`, `Tkl`, `Yel`, `Red`, `Crn` to team statistics (Possession, Shots on Target, Fouls, Corners, etc.) and recalculates `homeScore` and `awayScore`.
- **Basketball**: Maps `Pts`, `Reb`, `Ast`, `Stl`, `Blk`, `Tov`.
- **Baseball**: Maps `Runs`, `Hits`, `HR`, `Err`.
- **American Football**: Maps `TD`, `PassYds`, `RushYds`, `Tov`.
- **Tennis / Badminton / Volleyball / Hockey**: Sport-specific custom mappings.

---

### Game Finalization & Profile Propagation Engine (`src/services/gameFinalization.service.js`)

Invoked automatically when a game's status switches to `completed` or `finished`:
1. **Event De-duplication**: Filters out duplicate event timestamps and IDs.
2. **Team Stats Aggregation**: Re-calculates possession, shots, fouls, and cards for both sides.
3. **Player Rating Computation**:
   - Base rating: `6.0`
   - Goal scored: $+1.5$ rating
   - Assist: $+0.8$ rating
   - Shot on goal: $+0.1$ rating
   - Yellow card: $-0.5$ rating
   - Red card: $-2.0$ rating
   - Output clamped between `1.0` and `10.0`.
4. **Profile Stats Propagation**: Writes a Firestore batch updating all participating player profiles (`users/{id}`) with their career stats and the team profile (`roleData.performanceStats`).

---

### Real-time Distributed Event Listeners (`src/services/listener.service.js`)

Uses Firestore snapshot listeners to trigger real-time actions across the cluster:
- **Distributed Locking (`runWithLock`)**: Uses atomic Firestore transactions on `system_locks/{lockId}` so that multiple running backend instances do not duplicate notifications or finalizations.
- **`watchPosts()`**: Listens for new post documents. Dispatches push notifications to all followers and executes a **hybrid fan-out** (writes post reference directly into `users/{followerId}/feedItems` for accounts with $<1000$ followers).
- **`watchGames()`**: Listens for game creation (notifies followers) and game completion (triggers `gameFinalizationService.finalizeGame()`).
- **`watchEvents()`**: Listens for tournaments and custom event creation.

---

### Graph Recommendation & Social Network Service (`src/services/graph.service.js`)

Implements mutual follower graph traversal to compute "You May Know":
1. Fetches the calling user's following list (seeds).
2. Traverses the following lists of those seeds up to depth 2.
3. Excludes users already followed or the requester.
4. Aggregates intersection counts (mutual connections) and returns sorted suggestions.

---

### PDF Match Sheet Generator (`src/services/pdf.service.js`)

Uses `pdfmake` to generate official match report PDFs on the fly:
- Match header: Teams, logos, date, competition, and final score.
- Match statistics table (Possession, Shots, Fouls, Cards).
- Lineups & substitutes with player jersey numbers and positions.
- Full chronological event log (minute-by-minute action).
- Streams the resulting buffer directly to the client via `/api/games/:id/download`.

---

## 7. Background Cron Jobs & Automation Engine

Managed by `node-cron` in `src/jobs/cron.js`:

| Job File | Schedule | Interval / Time | Operations Performed |
|---|---|---|---|
| `weeklyAudit.js` | `0 0 * * 0` | Weekly on Sunday at Midnight | Executes comprehensive schema and role constraint audit across `users`, `posts`, `events`, and `chats`. Cleans up prior report, saves current report to RTDB `audit_issues/`, and dispatches one-time profile completion alerts with failure retry. |
| `calculateXP.js` | `0 1 * * *` | Daily at 1:00 AM | Iterates all users. Calculates XP based on `(games * 25) + (posts * 10) + (followers * 0.1)`. Assigns level (`rookie`, `prospect`, `starter`, `allStar`, `mvp`, `goat`) and `nextLevelXP`. |
| `flushEngagements.js` | `*/30 * * * *` | Every 30 Minutes | Flushes in-memory delta buffers (`tempEngagementScores.json` and `tempViewScores.json`) to Firestore via `FieldValue.increment`. Recalculates weighted engagement scores for active posts. |
| `tagSync.js` | `0 0 * * *` | Daily at Midnight | Extracts all unique hashtags from posts and users, building an aggregate tag frequency catalog. |
| `cleanupNotifications.js` | `0 12 * * *` | Daily at 12:00 PM | Scans users with $\ge 30$ notifications, sorting by date and pruning the oldest 20 items to conserve document size limits. |
| `syncMinUsers.js` | `0 3 * * *` | Daily at 3:00 AM | Syncs minified `{ id, username, name, profilePic, role }` from Firestore to `src/data/users_min.json` for fuzzy search. |
| `syncMinPosts.js` | `0 4 * * *` | Daily at 4:00 AM | Syncs `{ id, caption, tags, sport, userId }` to `src/data/posts_min.json`. |
| `syncMinGames.js` | `0 5 * * *` | Daily at 5:00 AM | Syncs `{ id, title, sport, homeTeam, awayTeam }` to `src/data/games_min.json`. |
| `computeSimilarity.js` | Batch / Nightly | As needed | Calculates Jaccard Index across all user `likedPosts` pairs: $\frac{|A \cap B|}{|A \cup B|}$. Stores top 10 matches in `users/{id}/computed/similarity`. |
| `calculateVelocity.js` | Batch / Hourly | As needed | Computes 48-hour velocity snapshots $\Delta \text{score} / \Delta \text{time}$ for trending feed boosts. |

---

## 8. Role-Based Access Control (RBAC) & Security Policies

Role permissions are structured in `config/permissions.js`:

| Permission | User/Fan | Athlete | Verified Athlete | Coach | Team | League | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `createAccount` / `deleteAccount` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `uploadPost` / `uploadHighlight` / `uploadThought` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `editOwnStats` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| `editPlayerStats` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `createGame` / `manageOwnGame` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `createTournament` / `manageOwnTournament` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `createSeason` / `manageOwnSeason` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `createSponsoredAd` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `manageAnyGame` / `manageAnySeason` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 9. Developer Operations & Deployment Guide

### Environment Variables Reference (`.env`)

```ini
# Firebase Admin SDK Credentials
TYPE=service_account
PROJECT_ID=catch-me-beta-dcff0
PRIVATE_KEY_ID=your_private_key_id
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCoIJ5DlV3193xz...-----END PRIVATE KEY-----\n"
CLIENT_EMAIL=firebase-adminsdk-fbsvc@catch-me-beta-dcff0.iam.gserviceaccount.com
CLIENT_ID=107671004317342930801
AUTH_URI=https://accounts.google.com/o/oauth2/auth
TOKEN_URI=https://oauth2.googleapis.com/token
AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40catch-me-beta-dcff0.iam.gserviceaccount.com
UNIVERSE_DOMAIN=googleapis.com
DATABASE_URL=https://catch-me-beta-dcff0-default-rtdb.firebaseio.com/
STORAGE_BUCKET=catch-me-beta-dcff0.firebasestorage.app

# Server Port
PORT=5000

# Redis Cache (Optional, defaults to localhost or in-memory fallback)
REDIS_URL=redis://localhost:6379

# AI Commentator API Keys
GEMINI_API_KEY=AIzaSy...
GROK_API_KEY=xai-...
```

### Local Setup & Execution
1. **Clone repository & enter directory**:
   ```bash
   cd catch_me_backend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run Development Server (with hot reloading via Nodemon)**:
   ```bash
   npm run dev
   ```
4. **Run Production Server**:
   ```bash
   npm start
   ```
5. **Verify Health**:
   ```bash
   curl http://localhost:5000/ping
   # Expected Output: {"status":"SUCCESS","message":"Pong!"}
   ```

### Production Deployment Strategy
- **Containerization**: Deployable via Docker with standard Node.js alpine images (`node:20-alpine`).
- **Process Manager**: Run via `pm2 start src/server.js -i max` for multi-core load balancing.
- **Reverse Proxy**: NGINX SSL termination forwarding traffic to upstream port 5000 with WebSocket upgrade headers enabled for Realtime Database proxies.
- **Firestore Indexing**: Deploy composite query indexes using `firebase deploy --only firestore:indexes`.
