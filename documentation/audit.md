# Catch Me Weekly Data Audit Pipeline & Role-Based Constraints Specification

## 1. Overview & Architecture

The **Catch Me Weekly Data Audit** is an automated, non-mutating data hygiene and compliance service. It operates across Google Cloud Firestore primary collections (`users`, `posts`, `events`, `chats`), validates schema constraints and role-based completion rules, surfaces relational anomalies, delivers actionable notifications to non-compliant users (with a one-time guarantee and failure retry), and publishes the active report directly to the Firebase Realtime Database (RTDB) under `audit_issues/`.

```
┌────────────────────────────────────────────────────────┐
│               Weekly Catch Me Data Audit               │
│          (node-cron @ Sunday 00:00 / Express API)      │
└───────────────────────────┬────────────────────────────┘
                            │
              Firestore Collection Scans (Users, Posts, Events, Chats)
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Validation Checks                    │
│   • ID Regex Validation: /^[A-Za-z0-9]{28}$/           │
│   • Role-Specific Profile Constraints                  │
│   • Foreign Key & Relational Integrity                 │
│   • Malicious/Anomaly Checks (Spam, Flags, Bad URLs)   │
└───────────────────────────┬────────────────────────────┘
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│   User Action Alerts    │   │ Firebase RTDB Persistence│
│  • Dispatch In-App & FCM│   │  audit_issues/ (Wiped &  │
│  • One-Time Guarantee   │   │  regenerated weekly)     │
│  • Retry on Failure     │   │  audit_notification_     │
│  • Deep Link to Editor  │   │  history/ (Persistent)   │
└─────────────────────────┘   └──────────────────────────┘
```

---

## 2. Role-Based Data Model Constraints Matrix

### Core User Profile Constraints (All Roles)
- **ID Regex**: Firebase Auth UID pattern `^[A-Za-z0-9]{28}$`.
- **Name**: Must be non-empty (minimum 2 characters, or valid non-empty `firstName` and `lastName`).
- **Username**: Must match `/^[a-zA-Z0-9._]{3,30}$/`.
- **Email**: Must match standard email format `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
- **Role**: Must be one of `athlete`, `verifiedathlete`, `coach`, `scout`, `scouter`, `team`, `league`, `fan`, `casual`, `sport fan`, `admin`.

### Role-Specific Completion Constraints

| Role | Mandatory Profile Fields | RoleData / Sub-Model Requirements |
|---|---|---|
| **Athlete / Verified Athlete** | • `name`<br>• `username`<br>• `email`<br>• `height.value > 0`<br>• `weight.value > 0`<br>• Primary sport in `favoriteSports` or `sports` | • `roleData.position` (or `position` / `roleData.dominant`)<br>• `roleData.number` (or `number` / `jerseyNumber`) |
| **Coach** | • `name`<br>• `username`<br>• `email`<br>• Coaching `sports` or `favoriteSports` | • Affiliation: `roleData.teamId` OR `roleData.team` OR `roleData.club` OR `roleData.organization` OR `roleData.schoolId` |
| **Scout / Scouter** | • `name`<br>• `username`<br>• `email`<br>• Specialties / `favoriteSports` | • Employer/Organization: `roleData.employer` OR `roleData.organization`<br>• Specialties: `roleData.specialty` OR `roleData.sportsDisciplines` |
| **Team** | • `name` (Team Name)<br>• `sport` (Governed sport)<br>• `email` | • City / Location |
| **League** | • `name` (League Name)<br>• `sport` (Governed sport)<br>• `email` | • Type (e.g. High School, College, Club, Pro) |
| **Fan / Casual / Sport Fan** | • `name`<br>• `username`<br>• `email` | • `favoriteSports` or `interestedSports` |
| **Admin** | • Full system privileges; core profile fields. | — |

---

## 3. Content, Event & Chat Constraints

### Posts (`posts` Collection)
- `userId`: Must match 28-char UID regex and exist in the `users` collection.
- `type`: Must be one of `highlight`, `image`, `thought`, `post`.
- For `highlight`: `data.videoUrl` is required and must come from approved domains.
- For `image`: `data.imageUrl` / `thumbnailUrl` / `files` is required.
- **Media Domain Sanitation**: URLs must match approved storage domains (`catch-me-beta-dcff0.firebasestorage.app`, `firebasestorage.googleapis.com`, `storage.googleapis.com`, `*.catchme.live`).
- **Metric Sanity**: `viewCount >= 0`, `engagementScore >= 0`, `velocity >= 0`.

### Events / Games (`events` Collection)
- `userId`: Must exist in `users`.
- `sport`: Non-empty string.
- `title`: Non-empty string.
- For `game`:
  - `currentState.homeScore >= 0`, `currentState.awayScore >= 0`.
  - `data.homeTeam.name` and `data.awayTeam.name` must exist.

### Chats (`chats` Collection)
- `members`: Must be an array of length $\ge 2$.
- Every member ID must exist in `users`.

---

## 4. Notification Delivery Rules

1. **One-Time Notification Guarantee**:
   - When a user has missing profile fields or role issues, the audit sends an alert.
   - Once successfully sent, `audit_notification_history/{userId}` is set to `{ status: "sent", sentAt: "...", missingFields: [...] }`.
   - In subsequent weekly audits, if the user still has issues, **no additional notification** is dispatched, ensuring users are not spammed.
2. **Failure Retry**:
   - If dispatch fails (e.g., missing FCM token, network failure), `audit_notification_history/{userId}` is marked as `{ status: "failed", lastAttemptAt: "...", error: "..." }`.
   - The audit pipeline will **retry** notification dispatch on subsequent weekly audits until it succeeds.
3. **Payload Structure**:
   ```json
   {
     "title": "Action Required: Complete Your Profile",
     "body": "Please complete your account profile (roleData.position, roleData.number) to ensure full access to Catch Me.",
     "data": {
       "link": "catchme://menu/settings",
       "type": "audit_profile_completion"
     }
   }
   ```

---

## 5. Firebase Realtime Database Topology

### `audit_issues/` (Wiped and regenerated on every audit)
```
audit_issues/
├── meta/
│   ├── auditId: "audit_1725283200000"
│   ├── timestamp: "2026-09-02T13:19:00.000Z"
│   ├── totalScanned: { users: 50, posts: 120, events: 35, chats: 10 }
│   ├── issueCounts: { malformedIds: 2, incompleteUsers: 5, flaggedContent: 1, relationalAnomalies: 0, totalIssues: 8 }
│   └── notificationSummary: { attempted: 3, sent: 2, failed: 1, skippedAlreadyNotified: 2 }
├── malformed_ids/
│   └── user_invalid_id_1: { collection: "users", invalidId: "123-bad-id", flaggedAt: "..." }
├── incomplete_users/
│   └── q3JbyQ6TxLdYQjmHqI5rAKcaTsp2: {
│         userId: "q3JbyQ6TxLdYQjmHqI5rAKcaTsp2",
│         username: "athlete_mike",
│         role: "athlete",
│         missingFields: ["roleData.position", "height"],
│         anomalies: [],
│         flaggedAt: "..."
│       }
├── flagged_content/
│   └── post_xyz789: { collection: "posts", documentId: "xyz789", flags: ["Unauthorized media domain"], flaggedAt: "..." }
└── relational_anomalies/
    └── post_xyz789_author: { collection: "posts", documentId: "xyz789", type: "orphaned_author", invalidUserId: "missing_user", flaggedAt: "..." }
```

### `audit_notification_history/` (Persistent history)
```
audit_notification_history/
└── q3JbyQ6TxLdYQjmHqI5rAKcaTsp2: {
      userId: "q3JbyQ6TxLdYQjmHqI5rAKcaTsp2",
      status: "sent",
      sentAt: "2026-09-02T13:19:00.000Z",
      missingFields: ["roleData.position"]
    }
```

---

## 6. API Reference (`/api/audit`)

| Method | Endpoint | Description | Query Parameters | Response |
|---|---|---|---|---|
| `POST` / `GET` | `/api/audit/run` | Execute weekly audit manually | `?dryRun=true` (optional) | `{ status: "SUCCESS", message: "...", meta: {...}, malformed_ids: {...}, ... }` |
| `GET` | `/api/audit/report` | Fetch latest active weekly report | — | Full report JSON from RTDB |
| `GET` | `/api/audit/history` | Fetch user notification status history | — | `{ status: "SUCCESS", data: { [userId]: { status, sentAt, ... } } }` |
| `DELETE` | `/api/audit/report` | Delete current report from RTDB | — | `{ status: "SUCCESS", message: "Audit report deleted..." }` |
