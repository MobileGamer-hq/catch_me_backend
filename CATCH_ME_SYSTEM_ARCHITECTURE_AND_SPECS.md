# Catch Me: Master System Architecture & Technical Specifications

**Document Title**: `CATCH_ME_SYSTEM_ARCHITECTURE_AND_SPECS.md`  
**System Name**: Catch Me Sports Platform  
**Version**: 1.0.0 (Production Release Specification)  
**Author**: Principal Software Architect & Lead Product Documentarian  
**Frontend Stack**: Flutter (v3.5.3+, Dart 3.x), GoRouter (v17.0.1), Provider, Chewie/VideoPlayer  
**Backend Stack**: Node.js (v20+ LTS), Express.js (v4.21.2), Firebase Admin SDK (v13.2.0), Node-Cron  
**Databases**: Google Cloud Firestore (Document ACID Store) & Firebase Realtime Database (Sub-ms Live Cache)  
**AI Intelligence**: Google Gemini 3.5 Flash & xAI Grok 4.3 Fallback  
**Infrastructure & CDN**: Firebase Cloud Infrastructure, Google Cloud Platform, Google Mobile Ads (AdMob)  

---

## Table of Contents
1. [Executive Summary & Project Identity](#1-executive-summary--project-identity)
2. [End-to-End User Experience & Journeys (User's Point of View)](#2-end-to-end-user-experience--journeys-users-point-of-view)
   - [Journey A: User Onboarding, Authentication, & Role Setup](#journey-a-user-onboarding-authentication--role-setup)
   - [Journey B: The Athlete Talent Showcase & Viral Highlight Loop](#journey-b-the-athlete-talent-showcase--viral-highlight-loop)
   - [Journey C: Real-Time Tactical Match Tracking & Substitution Flow](#journey-c-real-time-tactical-match-tracking--substitution-flow)
   - [Journey D: The Scout Prospecting & Evaluation Pipeline](#journey-d-the-scout-prospecting--evaluation-pipeline)
   - [Journey E: League & Tournament Championship Administration](#journey-e-league--tournament-championship-administration)
   - [Journey F: Secondary Workflows & Offline Recovery Mechanics](#journey-f-secondary-workflows--offline-recovery-mechanics)
3. [Frontend Architecture Deep Dive](#3-frontend-architecture-deep-dive)
   - [Architectural Pattern & Folder Organization](#architectural-pattern--folder-organization)
   - [State Management & Data Flow Architecture](#state-management--data-flow-architecture)
   - [Comprehensive Screen-to-System Mapping](#comprehensive-screen-to-system-mapping)
   - [Offline-First Local Storage Engine (`OfflineService`)](#offline-first-local-storage-engine-offlineservice)
4. [Backend Architecture Deep Dive](#4-backend-architecture-deep-dive)
   - [Server Topography & Controller-Service Pattern](#server-topography--controller-service-pattern)
   - [Database Schemas & Data Relational Architecture](#database-schemas--data-relational-architecture)
   - [Security, Authentication, & RBAC Matrix](#security-authentication--rbac-matrix)
   - [Background Automation & Cron Engine](#background-automation--cron-engine)
5. [Frontend-to-Backend Contract & Data Flow](#5-frontend-to-backend-contract--data-flow)
   - [Communication Protocols & Network Topology](#communication-protocols--network-topology)
   - [Concrete Feature Lifecycle Traces](#concrete-feature-lifecycle-traces)
   - [Complete Master API Route Inventory](#complete-master-api-route-inventory)
6. [External Integrations & Third-Party Cloud Services](#6-external-integrations--third-party-cloud-services)
7. [Developer & Operations Guide](#7-developer--operations-guide)
   - [Environment Variables Reference](#environment-variables-reference)
   - [Local Development & Multi-Repo Execution Guide](#local-development--multi-repo-execution-guide)
   - [Production Build & Deployment Topography](#production-build--deployment-topography)

---

## 1. Executive Summary & Project Identity

### Purpose & Vision
**Catch Me** is a purpose-built, high-performance digital sports ecosystem designed to democratize talent discovery, athlete portfolio management, tactical game tracking, and scouting across amateur, youth, high school, and collegiate sports.

Unlike generic social media platforms, Catch Me combines:
1. **Verified Athletic Portfolios**: Comprehensive physical metrics, career game logs, verified statistics, and interactive radar charts.
2. **High-Engagement Sports Media**: Vertical 9:16 highlight video feeds with low-latency streaming and personalized algorithmic distribution.
3. **Live Match Operations & Tactical Pitch Tracking**: Interactive drag-and-drop lineup management, real-time clock controls, substitution tracking, and automated stat reconciliation.
4. **AI-Powered Sports Journalism**: Automated match report generation powered by Google Gemini and xAI Grok.
5. **Dedicated Scouting Suite**: Specialized filters, prospect watchlists, and qualitative talent evaluation forms.

```
                    ┌─────────────────────────────────────────┐
                    │            CATCH ME PLATFORM            │
                    └────────────────────┬────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
┌──────────────┐                 ┌──────────────┐                 ┌──────────────┐
│   Athletes   │                 │    Coaches   │                 │    Scouts    │
│  & Portfolios│                 │  & Game Plan │                 │  & Prospects │
└───────┬──────┘                 └───────┬──────┘                 └───────┬──────┘
        │                                │                                │
        └────────────────────────────────┼────────────────────────────────┘
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │    Federated Engine: Flutter + Node     │
                    │  Firestore + RTDB + Gemini AI + AdMob   │
                    └─────────────────────────────────────────┘
```

### High-Level Architecture Summary
- **Repository Strategy**: Multi-repository architecture separating the presentation client (`catch_me_flutter`) and the business intelligence API server (`catch_me_backend`).
- **Client Runtime**: Flutter (Dart 3.x), targeting iOS, Android, and Web/PWA from a single codebase.
- **Server Runtime**: Node.js (v20+ LTS) running Express.js with Firebase Admin SDK, ioredis, and node-cron.
- **Database Model**: Polyglot persistence pairing Google Cloud Firestore (ACID transactional records) with Firebase Realtime Database (sub-millisecond live pub/sub, live scoreboards, and ephemeral cache).

---

## 2. End-to-End User Experience & Journeys (User's Point of View)

```mermaid
journey
    title Complete Catch Me User Lifecycle
    section Onboarding
      View Welcome Carousel: 5: User
      Sign In with Apple/Google/Email: 5: User
      Complete Role & Physical Setup: 4: User
    section Core Engagement
      Browse Personalized Feed: 5: User
      Watch & Like Video Highlights: 5: User
      Track Live Match with Pitch View: 5: User, Coach
      Generate AI Match Commentary: 5: User, Coach
    section Scouting & League
      Search Prospects by Region & Sport: 5: Scout
      Write Scout Evaluation Notes: 5: Scout
      Manage Season Brackets & Standings: 4: League
```

### Journey A: User Onboarding, Authentication, & Role Setup

```
[WelcomeScreen Carousel] ──► [LandingScreen] ──► [SignUp / SignIn] ──► [SetUpScreen Wizard] ──► [TabScreen (Home)]
```

1. **First Launch**: The user is greeted with a 3-page interactive onboarding carousel (`WelcomeScreen`) showcasing highlight discovery, live match tracking, and talent scouting.
2. **Authentication Gate (`AuthGate`)**: The app checks if a valid Firebase Auth session exists in local cache:
   - If authenticated, it routes directly to `/tabs`.
   - If unauthenticated, it routes to `LandingScreen`.
3. **Registration / Login (`SignUpScreen` / `SignInScreen`)**:
   - Supports Email/Password, Google Sign-In (`google_sign_in`), and Apple Sign-In (`sign_in_with_apple`).
   - Validates email formatting, username uniqueness via Firestore query, and password strength (minimum 6 characters).
4. **Profile Onboarding Wizard (`SetUpScreen`)**:
   - **Step 1 (`SetUpGeneralInfo`)**: First name, last name, date of birth, gender, country, and location.
   - **Step 2 (`SetUpProfile`)**: Profile picture upload to Firebase Storage, bio, and social handles (Instagram, X, YouTube, TikTok).
   - **Step 3 (`SetUpRoleInfo`)**: The user selects their primary persona from 6 distinct roles:
     - **Athlete**: Selects sport, position, jersey number, dominant hand/foot, height, weight, and school/team affiliation.
     - **Coach**: Sets coaching title, school/club name, level (Youth, High School, College), and experience years.
     - **Scout**: Configures scouting regions covered and sports expertise disciplines.
     - **Team**: Registers club name, sport, school name, and uploads team crest/logo.
     - **League**: Sets league name, commissioner details, and participating sports.
     - **Fan**: Selects favorite sports, teams, and athletes.
   - **Step 4 (`SetUpFinish`)**: Selects interested `#hashtags`, triggers initial profile document creation in Firestore (`users/{userId}`), and transitions into the main 5-tab interface (`/tabs`).

---

### Journey B: The Athlete Talent Showcase & Viral Highlight Loop

```
[Upload Studio] ──► [Video Capture / Pick] ──► [Upload to Storage] ──► [Post Creation] ──► [Listener Hybrid Fan-out] ──► [Feed Recommendation Engine]
```

1. **Highlight Recording / Picking**: An athlete taps the central **Upload** tab (`UploadPage`), selects **Upload Highlight**, and records or selects a 9:16 vertical video.
2. **Metadata & Tagging**: Enters a captivating caption (e.g., "Buzzer beater three in district finals!"), attaches the sport category (`basketball`), and appends relevant tags (`#clutch`, `#pointguard`).
3. **Upload Execution**: `VideoUploadHelper` compresses the video, generates a thumbnail image, and uploads the video file to Firebase Cloud Storage at `posts/{userId}/{timestamp}.mp4`.
4. **Firestore Document Write**: Creates a new document in `posts/{postId}`.
5. **Backend Listener Trigger (`listener.service.js`)**:
   - Background listener `watchPosts()` detects the new document.
   - Acquires distributed lock `post_{postId}`.
   - Dispatches Firebase Cloud Messaging (FCM) push notifications to all followers.
   - Performs a **hybrid fan-out**, writing the post reference directly to `users/{followerId}/feedItems` for accounts with $<1000$ followers.
6. **Algorithmic Distribution (`feed.service.js`)**: The post is scored based on cold-start boosting ($2.0\times$ multiplier for new creators), role credibility, tag matches, and time decay, appearing in the personalized feeds (`FeedPage`) of scouts, coaches, and fans.

---

### Journey C: Real-Time Tactical Match Tracking & Substitution Flow

```
[Create Game Wizard] ──► [GameTrackerScreen] ──► [Lineup Drag & Drop] ──► [Live Event Logging] ──► [End Game] ──► [AI Commentary & Stats Propagation]
```

1. **Match Initialization**: A coach or team manager creates a match via `CreateGame`, setting Home and Away teams, sport, match date, periods, and roster lineups.
2. **Live Match Tracker (`GameTrackerScreen`)**:
   - **Tactical Pitch View (`LineUp`)**: Visualizes players on the field using normalized `(x, y)` coordinates based on formation presets (e.g., 4-3-3, 4-4-2, 2-3 Zone).
   - **Drag & Drop Substitutions**: The coach drags a player card from the bench tray onto an active pitch position. The UI immediately updates the formation node, and `GameSystem` logs a `GameEventType.substitution` event into the timeline.
   - **Clock & Match Events**: The coach taps **Start Clock** (`GameTimerWidget`), triggering the timer. When a goal/point is scored, tapping **Goal** opens the event modal, assigning the scoring player, assist player, and match minute.
3. **Live Sync to Spectators**: `GameSystem` batches updates to Firestore (`events/{gameId}`) and pushes live score updates to Firebase Realtime Database. Spectators watching on `GameScreen` receive sub-second score changes.
4. **Game Finalization (`gameFinalization.service.js`)**:
   - When the coach taps **End Game**, status updates to `completed`.
   - `listener.service.js` triggers `GameFinalizationService`:
     - Deduplicates match events.
     - Aggregates team totals (Possession %, Shots on Target, Fouls, Cards).
     - Calculates player ratings ($1.0 - 10.0$) based on actions (Goals $+1.5$, Assists $+0.8$, Cards $-0.5$).
     - Propagates career stats directly to player profile documents (`users/{playerId}`).
5. **AI Sports Journalism (`aiService.js`)**:
   - The backend passes the match sheet JSON to Google Gemini (`gemini-3.5-flash`).
   - Gemini writes an engaging sports article narrating the match timeline.
   - The summary is cached in RTDB (`game_summaries/{gameId}`) and rendered in the app's `GameSummary` view.
6. **PDF Match Export (`pdf.service.js`)**: Users tap **Export Match Report**, and the backend streams a formatted PDF match sheet containing lineups, match stats, and the chronological event timeline.

---

### Journey D: The Scout Prospecting & Evaluation Pipeline

```
[Explore / Search] ──► [ScoutSearchParameters Filter] ──► [Athlete Profile & Radar Chart] ──► [AddScoutNote Evaluation] ──► [Scout Watchlist]
```

1. **Prospect Discovery**: A verified scout opens the **Explore** tab or **Scouter Dashboard** (`ScouterScreen`).
2. **Multi-Parameter Search (`ScoutSearchParameters`)**: Filters prospects by sport (e.g., Football), position (Striker), graduation year, state/region, and minimum stat thresholds (e.g., $>15$ goals).
3. **Portfolio Audit**: The scout reviews the athlete's `ProfileScreen`:
   - Inspects physical attributes (Height, Weight, Dominant foot).
   - Audits the dynamic **Radar Chart** (`RadarChartWidget`).
   - Watches video highlight reels directly in the profile grid.
4. **Talent Evaluation (`AddScoutNote`)**:
   - Taps **Add Scout Note**, entering a scouting evaluation title, grade ($1.0 - 10.0$), tactical observations, athletic ceiling, and development areas.
   - Saves the private evaluation note (`ScoutEvaluation`) to their private dashboard (`ScoutNotesList`).
5. **Real-Time Watchlist Alerts**: The scout bookmarks the athlete to their **Saved Athletes** list. Whenever the athlete logs a new match or uploads a highlight, the scout receives a high-priority push notification.

---

### Journey E: League & Tournament Championship Administration

```
[League Dashboard] ──► [Create Season / Tournament] ──► [Fixture Scheduling] ──► [Match Results] ──► [Dynamic Standings Table]
```

1. **League Setup**: A league commissioner configures the league identity (`LeagueScreen`), attaching participating teams and sponsors.
2. **Season Creation (`ManageSeasonTeams`)**: Creates a new competition season (e.g., "Fall 2026 Championship").
3. **Fixture Generation**: Configures match fixtures across dates and venues.
4. **Automated Standings Calculation**: As matches are tracked and finalized, the backend and `SeasonSystem` update the standings table in real time, recalculating Matches Played (MP), Wins (W), Draws (D), Losses (L), Goals For (GF), Goals Against (GA), Goal Difference (GD), and Points (PTS).

---

### Journey F: Secondary Workflows & Offline Recovery Mechanics

1. **Offline Match Tracking**: If a match is tracked in a venue without internet connectivity, `GameSystem` automatically falls back to `OfflineService`, writing match states to local JSON files (`/games/game_{id}.json`). When connectivity returns, tapping **Go Online** syncs the match to Firestore and clears the local file.
2. **Notification Inbox (`NotificationScreen`)**: Displays an inbox of game invites, follow alerts, comment mentions, and system updates with unread indicators.
3. **Dark / Light Theme Customization**: `ThemeProvider` enables users to toggle between dark and light themes, instantly updating all color tokens and persisting the setting via `SharedPreferences`.
4. **App Tracking Transparency (ATT)**: On iOS, users are presented with an educational modal prior to the native ATT prompt, ensuring strict compliance with Apple review standards.

---

## 3. Frontend Architecture Deep Dive

### Architectural Pattern & Folder Organization

The Flutter codebase follows a **Clean Feature-First / Layered Architecture**:

```
lib/
├── models/        # Entity classes with JSON serialization & factory constructors
├── services/      # Static & singleton API/Firebase interfaces
├── systems/       # Domain business logic & state mutation controllers
├── providers/     # Global state providers (ThemeProvider)
├── routes/        # Declarative GoRouter routing engine
├── screens/       # Full-page UI views organized by domain (auth, tab, game, scouter)
├── widgets/       # Atomic, reusable UI components (buttons, charts, feeds, popups)
├── utilities/     # Formatting, date parsing, links, and sports calculations
└── constants/     # Themes, typography, colors, asset paths, and enums
```

---

### State Management & Data Flow Architecture

Catch Me avoids heavyweight boilerplates in favor of high-performance, domain-targeted reactive state management:

```
┌────────────────────────────────────────────────────────┐
│                   Global UI State                      │
│      (ThemeProvider -> SharedPreferences Persistence)  │
└────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────┐
│                 Domain Business State                  │
│  (GameSystem -> ChangeNotifier + Streams + UI Triggers)│
└────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────┐
│                 Real-Time Cloud Streams                │
│ (Firestore Snapshots + RTDB Pub/Sub + FCM Push Events) │
└────────────────────────────────────────────────────────┘
```

1. **`GameSystem` (ChangeNotifier)**: Encapsulates all mutable state for live matches. It maintains:
   - Match clock, period timers, and stoppage time calculations.
   - Active pitch lineup slots (`Map<String, LineUpPos>`) and substitute arrays.
   - Chronological event timeline (`List<GameEvent>`).
   - Dirty-field tracking (`Set<String> _updatedData`) for optimized Firestore patch updates.
2. **`ThemeProvider` (ChangeNotifier)**: Listens for theme changes, persists dark/light preferences to `SharedPreferences`, and rebuilds MaterialApp dynamically.
3. **Reactive Listeners & Streams**:
   - `RealtimeDatabaseService.listenToAppEvents()`: Listens for global marketing popups and system-wide announcements.
   - `RealtimeDatabaseService.getAthleteRankings()`: Streams live cached leaderboard standings.
   - `FirestoreService.firestore.collection('events').doc(gameId).snapshots()`: Synchronizes spectator match views in real time.

---

### Comprehensive Screen-to-System Mapping

| Screen / View | File Path | Controlling Logic / System | Primary Models / Data |
|---|---|---|---|
| `AuthGate` | `lib/screens/auth.dart` | `AuthService._checkAuth` | `FirebaseAuth.currentUser` |
| `LandingScreen` | `lib/screens/auth/landing.dart` | `AuthService` | None |
| `SignInScreen` | `lib/screens/auth/sign_in.dart` | `AuthService.signIn` | `MyUser` |
| `SignUpScreen` | `lib/screens/auth/sign_up.dart` | `AuthService.signUp` | `MyUser` |
| `SetUpScreen` | `lib/screens/set-up/set_up_screen.dart` | Multi-step form controllers | `MyUser`, `Role`, `Measure` |
| `TabScreen` | `lib/screens/tab/tabs_screen.dart` | `PageController`, `TrackingService` | `MyUser` |
| `HomePage` | `lib/screens/tab/home.dart` | `FeedService`, `StoryService`, `AdsService` | `Post`, `Events`, `Story` |
| `FeedPage` | `lib/screens/tab/feed.dart` | `VideoPlayerController`, `Chewie` | `Post`, `Comment` |
| `ExplorePage` | `lib/screens/tab/explore.dart` | `SearchService`, `LeaderboardService` | `MyUser`, `Events`, `Post` |
| `ProfilePage` | `lib/screens/tab/profile.dart` | `FirestoreService` | `MyUser`, `Athlete`, `Team` |
| `GameTrackerScreen` | `lib/screens/tracker/game_tracker.dart` | `GameSystem` | `Game`, `GameTeam`, `GameEvent` |
| `GameScreen` | `lib/screens/game/game_screen.dart` | `FirestoreService`, `ApiService` | `Game`, `Events` |
| `ScouterScreen` | `lib/screens/scouter/scouter_screen.dart`| `SearchService` | `Scout`, `MyUser`, `ScoutEvaluation` |
| `AddScoutNote` | `lib/screens/scouter/add_scout_note.dart` | `FirestoreService` | `ScoutEvaluation`, `MyUser` |
| `SeasonDetailScreen`| `lib/screens/league/season_detail.dart` | `SeasonSystem` | `Season`, `Fixture`, `League` |
| `LeagueScreen` | `lib/screens/league/league.dart` | `FirestoreService` | `League`, `Team`, `Season` |
| `RankingsScreen` | `lib/screens/list/rankings.dart` | `RealtimeDatabaseService` | `AthleteRank` |
| `PostScreen` | `lib/screens/post/post_screen.dart` | `FirestoreService` | `Post`, `Comment` |
| `StoriesScreen` | `lib/screens/story.dart` | `StoryService` | `Story`, `MyUser` |
| `UploadStoryScreen`| `lib/screens/upload/upload_story.dart` | `StorageService` | `Story`, `MyUser` |
| `ChatScreen` | `lib/screens/chat/chat.dart` | `FirestoreService` | `ChatMessage`, `ChatRoom` |
| `SettingsScreen` | `lib/screens/menu/settings.dart` | `ThemeProvider`, `AuthService` | `UserSettings` |
| `CompareStats` | `lib/screens/menu/compare_stats.dart` | `QuickInfoUtils` | `MyUser`, `Athlete` |
| `GamePlanScreen` | `lib/screens/menu/game_plan.dart` | `GameSystem` | `Team`, `TeamLineUp` |

---

### Offline-First Local Storage Engine (`OfflineService`)

```
[Match State Mutation] ──► [isOffline Check] ──► [Write to /games/game_{id}.json]
                                                      │
                                                      ▼ (On Network Reconnect)
[Tap "Go Online"] ──► [Upload to Firestore] ──► [Backend Standardization] ──► [Delete Local File]
```

- **Storage Location**: `getApplicationDocumentsDirectory() + '/games/game_{id}.json'`.
- **Payload Schema**: Includes schema version, `savedAt` timestamp, `uploaded: false` flag, and full serialized `Game.toJson()`.
- **Sync Reconciliation**: `GameSystem.goOnline()` validates local match payloads, transitions `isOffline = false`, uploads the record to Firestore, calls `APIUtils.standardizeGame(game.id)`, and purges the local file.

---

## 4. Backend Architecture Deep Dive

### Server Topography & Controller-Service Pattern

The backend is built with Express.js following a strictly decoupled controller-service pattern:
1. **`src/app.js`**: Defines Express middlewares (CORS, body parser, `responseFormatter`, `sessionContext`), registers route trees, and configures the global error handler.
2. **`src/server.js`**: Initializes database background listeners, boots the cron scheduling engine, and binds to HTTP port 5000.
3. **`src/controllers/`**: Validates input parameters, checks session headers, and delegates execution to services.
4. **`src/services/`**: Implements domain business logic (recommendations, stat reconciliations, AI article generation, PDF exports).
5. **`src/utils/db.js`**: Exposes sanitized helper methods for Firestore and Firebase Realtime Database.

---

### Database Schemas & Data Relational Architecture

#### Relational Topology Diagram:

```mermaid
erDiagram
    USERS ||--o{ POSTS : creates
    USERS ||--o{ EVENTS : organizes
    USERS ||--o{ CHATS : participates
    EVENTS ||--o{ GAME_EVENTS : logs
    USERS ||--o{ SCOUT_EVALUATIONS : authored_by
    USERS ||--o{ SCOUT_EVALUATIONS : evaluates_athlete
    LEAGUES ||--o{ SEASONS : contains
    SEASONS ||--o{ EVENTS : schedules

    USERS {
        string id PK
        string username
        string email
        string role
        boolean verified
        int xp
        int level
        string[] followers
        string[] following
    }
    POSTS {
        string id PK
        string userId FK
        string type
        int engagementScore
        int viewCount
        float velocity
        string[] likes
        string[] tags
    }
    EVENTS {
        string id PK
        string userId FK
        string type
        string sport
        string status
        int homeScore
        int awayScore
    }
```

---

### Security, Authentication, & RBAC Matrix

Authentication is anchored on **Firebase Auth ID Tokens** verified via the Firebase Admin SDK. Role-based permissions are enforced via `config/permissions.js`:

| Role | Permitted Capabilities | Restricted Capabilities |
|---|---|---|
| **Fan / User** | Browse feeds, like/comment/share posts, vote on matches, view leaderboards, message contacts. | Creating official games, editing player stats, creating seasons. |
| **Athlete** | All Fan actions + upload highlights, manage athletic profile, view scout views, edit personal performance stats. | Editing opposing player stats, creating league seasons. |
| **Verified Athlete** | All Athlete actions + verified badge, create open challenges and tournaments. | Administrative league actions. |
| **Coach** | All Athlete actions + create official games, manage team lineups, edit team player stats, draft game plans. | Managing league seasons outside affiliated club. |
| **Team Manager** | All Coach actions + manage official team profile, edit team rosters, schedule matches. | System administration. |
| **Scout** | Access advanced prospect filters, create private scout notes, save watchlists, view detailed performance breakdowns. | Editing player match stats. |
| **League Admin** | Create and manage league seasons, generate tournament brackets, register participating teams, create sponsored ads. | None within league scope. |
| **Super Admin** | Full access (`allPermissions`), user ban/shadowban, content moderation, verification approvals. | None. |

---

### Background Automation & Cron Engine

Operated by `node-cron` in `src/jobs/cron.js`:

```
┌────────────────────────────────────────────────────────┐
│                 Master Cron Scheduler                  │
└──────────────────────────┬─────────────────────────────┘
                           │
  ├─► 00:00 (Midnight) ────┼─► Tag Sync Job (tagSync.js)
  │                        │
  ├─► 01:00 AM ────────────┼─► Daily XP Calculation (calculateXP.js)
  │                        │
  ├─► 03:00 AM ────────────┼─► Minified Users Sync (syncMinUsers.js)
  │                        │
  ├─► 04:00 AM ────────────┼─► Minified Posts Sync (syncMinPosts.js)
  │                        │
  ├─► 05:00 AM ────────────┼─► Minified Games Sync (syncMinGames.js)
  │                        │
  ├─► 12:00 PM (Noon) ─────┼─► Notification Cleanup (cleanupNotifications.js)
  │                        │
  └─► Every 30 Minutes ────┴─► Engagement Flusher (flushEngagements.js)
```

---

## 5. Frontend-to-Backend Contract & Data Flow

### Communication Protocols & Network Topology
- **REST API (JSON over HTTPS)**: Primary transport for heavy computations, complex search queries, AI generation, and administrative actions (`https://api2.catchme.live/api` with fallback to `https://api.catchme.live/api`).
- **Firebase Firestore Native SDK (gRPC/HTTP2)**: Real-time transactional streams for chats, user profile updates, post likes, and match comments.
- **Firebase Realtime Database (WebSockets)**: Sub-millisecond live match scoreboard streaming, push notification feeds, and live marketing popup distribution.
- **Firebase Cloud Messaging (FCM HTTP v1)**: Multicast and single-device push notifications.

---

### Concrete Feature Lifecycle Traces

#### Feature Lifecycle Trace 1: Live Match Goal Scored & Post-Game Finalization

```
1. [User Interaction] Coach taps "Goal" on GameTrackerScreen
   │
2. [GameSystem Mutation] Increments homeScore, appends GameEvent to timeline, plays whistle sound
   │
3. [Optimistic UI] Scoreboard & timeline update immediately (0ms latency)
   │
4. [Network Payload] GameSystem batches updated fields -> PATCH to Firestore /events/{gameId}
   │
5. [Realtime Mirror] Writes score update to RTDB /events/{gameId}/currentState
   │
6. [Spectator Render] Spectator phones receive RTDB WebSocket event -> MiniGameView updates
   │
7. [Match End] Coach taps "End Game" -> Status updates to "completed"
   │
8. [Backend Listener] listener.service.js detects change -> Acquires lock "finalize_game_{id}"
   │
9. [Finalization Service]
   ├─► gameFinalization.service.js recalculates team possession, shots, fouls
   ├─► Computes player ratings (Alex Hunter: 9.2 rating)
   ├─► Batch updates player profiles (users/{id}) with career stats
   └─► Invokes aiService.js (Gemini 3.5 Flash) -> Generates match summary article
   │
10. [Client Render] GameScreen displays final score, match summary article, and ratings
```

#### Feature Lifecycle Trace 2: Personalized Feed Generation & A/B Telemetry

```
1. [User Interaction] User opens Home Tab (/tabs)
   │
2. [HTTP Request] GET /api/feed/{userId}?filter=all
   Headers: { 'Authorization': 'Bearer <token>', 'x-session-id': 'sess_abc123' }
   │
3. [Middleware Pipeline]
   ├─► responseFormatter wraps response
   └─► sessionContext parses 'sess_abc123' -> Assigns Bucket 'B' (Shares weighted higher)
   │
4. [FeedService & FeedSystem]
   ├─► Candidate Fetch: Queries followed users, interested sports, and trending posts
   ├─► Score Calculation:
   │   - BaseEngagement: (views*1 + likes*2 + comments*4 + shares*8 + saves*5)
   │   - Log Scaling: log10(1 + BaseScore)
   │   - Time Decay: max(1, AgeInHours / 24)
   │   - Velocity Boost: min(2.0, 1 + Velocity/10)
   │   - Trust Multiplier: Role & verification factors
   │   - Personalization: Following (+30), Sport (+20), Tags (+5/match)
   ├─► Threshold Filter: Drops items below min engagement/view counts
   ├─► Diversity Control: Limits to max 3 posts/author & max 5 consecutive/sport
   └─► Serializes categorized output: { highlights: [], images: [], thoughts: [], games: [] }
   │
5. [HTTP 200 Response] Payload received by Flutter client
   │
6. [UI Rendering] HomePage renders StoryTray, Video Highlights, and injects Native AdMob cards
   │
7. [Dwell Telemetry] When user views highlight for 12 seconds:
   POST /api/engage/signal { type: 'dwell', targetId: 'post_123', value: 12000 }
```

---

### Complete Master API Route Inventory

| Method | Endpoint | Description | Auth Requirement | Request Body / Query Params | Expected Success Response |
|---|---|---|---|---|---|
| `GET` | `/api/users` | Retrieve all users | Optional | None | `{ status: "SUCCESS", data: MyUser[] }` |
| `GET` | `/api/users/:id` | Get user by ID | Optional | `params: { id }` | `{ status: "SUCCESS", ...MyUser }` |
| `DELETE`| `/api/users/:id` | Deep clean & delete user and all traces | Bearer Token | `params: { id }` | `{ status: "SUCCESS", message: "User deleted" }` |
| `GET` | `/api/users/search` | Prefix search by name/username | Optional | `query: { q }` | `{ status: "SUCCESS", data: MyUser[] }` |
| `GET` | `/api/users/local-search`| Local fuzzy search on minified user cache | Optional | `query: { q }` | `{ status: "SUCCESS", data: MinUser[] }` |
| `GET` | `/api/users/:id/suggestions`| Graph mutual follower suggestions | Optional | `params: { id }` | `{ status: "SUCCESS", data: Suggestion[] }` |
| `GET` | `/api/feed/:id` | Personalized mixed feed | Optional | `params: { id }`, `query: { filter }` | `{ status: "SUCCESS", posts: {}, games: [] }` |
| `GET` | `/api/feed/:id/:type/:subtype?`| Granular feed component retrieval | Optional | `params: { id, type, subtype }` | `{ status: "SUCCESS", data: [] }` |
| `GET` | `/api/games` | Get all games | Optional | None | `{ status: "SUCCESS", data: Game[] }` |
| `GET` | `/api/games/:id` | Get game by ID | Optional | `params: { id }` | `{ status: "SUCCESS", ...Game }` |
| `POST`| `/api/games/:id/standardize`| Standardize team metrics & scores | Optional | `params: { id }` | `{ status: "SUCCESS", game: Game }` |
| `POST`| `/api/games/:id/end` | End game session | Optional | `params: { id }` | `{ status: "SUCCESS", ...Game }` |
| `POST`| `/api/games/:id/export` | Generate PDF export link | Optional | `params: { id }` | `{ status: "SUCCESS", downloadUrl: string }` |
| `GET` | `/api/games/:id/download`| Stream PDF binary file | Optional | `params: { id }` | Binary stream (`application/pdf`) |
| `POST`| `/api/games/:id/summary`| Generate/Fetch AI match commentary | Optional | `params: { id }` | `{ status: "SUCCESS", summary: string }` |
| `PUT` | `/api/games/:id/summary`| Refresh AI match commentary | Optional | `params: { id }` | `{ status: "SUCCESS", summary: string }` |
| `DELETE`|`/api/games/:id/summary`| Remove cached summary from RTDB | Optional | `params: { id }` | `{ status: "SUCCESS", message: "..." }` |
| `GET` | `/api/events` | Get all events | Optional | None | `{ status: "SUCCESS", data: Event[] }` |
| `GET` | `/api/events/local-search`| Local fuzzy search for games | Optional | `query: { q }` | `{ status: "SUCCESS", data: MinGame[] }` |
| `GET` | `/api/events/:id` | Get event by ID | Optional | `params: { id }` | `{ status: "SUCCESS", ...Event }` |
| `DELETE`|`/api/events/:id` | Delete event | Optional | `params: { id }` | `{ status: "SUCCESS", message: "..." }` |
| `GET` | `/api/events/:type` | Filter events by type | Optional | `params: { type }` | `{ status: "SUCCESS", data: Event[] }` |
| `POST`| `/api/engage/signal` | Log dwell/click interaction signal | Optional | `{ type, targetId, targetType, value }` | `{ status: "SUCCESS", message: "..." }` |
| `GET` | `/api/posts/local-search`| Local fuzzy search for posts | Optional | `query: { q }` | `{ status: "SUCCESS", data: MinPost[] }` |
| `GET` | `/api/posts/:id` | Get post feed item | Optional | `params: { id }` | `{ status: "SUCCESS", ...Post }` |
| `DELETE`|`/api/posts/:id` | Delete post | Optional | `params: { id }` | `{ status: "SUCCESS", message: "..." }` |
| `GET` | `/api/search` | Global federated search | Optional | `query: { q }` | `{ status: "SUCCESS", data: { users, teams, hashtags } }` |
| `GET` | `/api/leaderboard` | Filtered leaderboard with RTDB cache | Optional | `query: { role, country, sport, limit, page }` | `{ status: "SUCCESS", data: { data: [], total, page } }` |
| `POST`| `/api/notifications/send` | Send push notification | Optional | `{ userIds, notification: { title, body } }` | `{ status: "SUCCESS", data: FCMResponse }` |
| `POST`| `/api/notifications/send-all`| Broadcast push to all users | Optional | `{ notification: { title, body } }` | `{ status: "SUCCESS", data: FCMResponse }` |

---

## 6. External Integrations & Third-Party Cloud Services

| Service Name | Purpose in Catch Me | Client/Backend Modules Handling Integration | Data Exchanged & Trigger Points |
|---|---|---|---|
| **Firebase Authentication** | User identity, email/password auth, OAuth tokens | `lib/services/auth_service.dart`, `src/config/firebase.js` | JWT tokens, UID, password hashes, email verification. Triggered on signup, login, session validation. |
| **Google Sign-In** | One-tap OAuth login | `lib/services/auth_service.dart`, `google_sign_in` | Google ID tokens, display name, email, profile picture URL. |
| **Sign in with Apple** | Native iOS Apple ID authentication | `lib/services/auth_service.dart`, `sign_in_with_apple` | Apple authorization codes, user identity tokens, nonce hashes. |
| **Cloud Firestore** | Primary ACID transactional document database | `lib/services/firestore_service.dart`, `src/utils/db.js` | User profiles, posts, matches, chats, evaluations. Triggered on all core user interactions. |
| **Firebase Realtime Database** | Sub-millisecond live match cache & pub/sub | `lib/services/real_time_database_services.dart`, `src/utils/db.js` | Live scoreboard updates, match clock ticks, AI summaries, leaderboard cache, in-app event modals. |
| **Firebase Cloud Storage** | Object store for media binaries | `lib/services/storage_service.dart` | Vertical MP4 video highlights, JPEG images, team logos, PDF match sheets. |
| **Firebase Cloud Messaging (FCM)** | Remote push notifications & background messaging | `lib/services/notification_service.dart`, `src/services/notificationService.js` | APNs/FCM device tokens, push payloads (titles, deep links, alert messages). |
| **Google Mobile Ads (AdMob)** | In-app monetization via native & banner ads | `lib/services/ads_service.dart`, `lib/widgets/ads/` | Native ad units, impressions, clicks. Preloaded into memory pool on home feed launch. |
| **Google Gemini API** | Primary sports journalism AI commentator | `src/services/aiService.js` (`@google/genai`) | Raw JSON match sheets in -> Narrative sports articles out. Triggered on game completion. |
| **xAI Grok API** | Fallback sports journalism AI commentator | `src/services/aiService.js` (Axios REST) | Raw JSON match sheets in -> Narrative articles out. Triggered if Gemini hits error/quota limits. |
| **Firebase Crashlytics** | Real-time crash diagnostics & stack traces | `lib/main.dart`, `firebase_crashlytics` | Uncaught fatal errors, device hardware metadata, framework exceptions. |
| **Firebase Analytics** | User engagement telemetry & session funnels | `lib/services/analytics_service.dart`, `TrackingService` | Screen views, video completions, match starts, signup events. |
| **pdfmake** | Server-side binary PDF generation | `src/services/pdf.service.js` | Match lineups, scores, and event timeline -> Binary PDF buffer. |
| **App Tracking Transparency** | iOS privacy compliance & permission gating | `lib/services/tracking_service.dart` | ATT authorization status (`authorized`, `denied`, `notDetermined`). |

---

## 7. Developer & Operations Guide

### Environment Variables Reference

#### Backend Environment Variables (`catch_me_backend/.env`):
```ini
# Firebase Service Account Credentials
TYPE=service_account
PROJECT_ID=catch-me-beta-dcff0
PRIVATE_KEY_ID=cd329eeeb64c3d419ce4205d966334305783e64d
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

# Server Configuration
PORT=5000

# Redis Cache URL
REDIS_URL=redis://localhost:6379

# AI API Credentials
GEMINI_API_KEY=your_gemini_api_key_here
GROK_API_KEY=your_grok_api_key_here
```

#### Frontend Configuration (`catch_me_flutter/lib/firebase_options.dart`):
Automatically configured via FlutterFire CLI supporting Android, iOS, Web, macOS, and Windows targets linked to Firebase project `catch-me-beta-dcff0`.

---

### Local Development & Multi-Repo Execution Guide

#### 1. Running the Backend Server:
```bash
cd catch_me_backend
npm install
npm run dev
# Server boots on port 5000 with nodemon and starts background listeners and crons
```

#### 2. Running the Flutter Client:
```bash
cd catch_me_flutter
flutter pub get
flutter run
```

---

### Production Build & Deployment Topography

```
                    ┌─────────────────────────┐
                    │      Cloudflare DNS     │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌─────────────────────────┐                   ┌─────────────────────────┐
│     Client Releases     │                   │     Backend Cluster     │
│ ├─ iOS: App Store (IPA) │                   │ ├─ NGINX Reverse Proxy  │
│ ├─ Android: Play Store  │                   │ ├─ PM2 Cluster Mode     │
│ └─ Web: Firebase Hosting│                   │ └─ Docker Containerized │
└─────────────────────────┘                   └─────────────────────────┘
```

#### Android Production Build:
```bash
flutter build appbundle --release
```

#### iOS Production Build:
```bash
flutter build ipa --release
```

#### Backend Production Dockerfile Configuration:
```dockerfile
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
```

---

**End of Master Technical Specifications.**
