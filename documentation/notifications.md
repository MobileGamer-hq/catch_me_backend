# Notification Routes (`/api/notifications`)

The Notifications module coordinates push notifications and in-app event broadcasts across iOS, Android, and Web using **Firebase Cloud Messaging (FCM)**. Every dispatch is audited and logged in the Firebase Realtime Database.

---

## Base Path
```http
/api/notifications
```

---

## Recipient Targeting Options

When sending notifications, at least one recipient identifier must be specified in the request body:
- **`token`**: Direct dispatch to a single FCM device token.
- **`tokens`**: Multicast dispatch to an array of FCM device tokens.
- **`userIds`**: Backend automatically resolves the `fcmToken` field from each user's Firestore document.
- **`sendToAll`**: Dispatches the notification to all registered users with active FCM tokens.

---

## Endpoints

### 1. Send Notification / Event
Sends a push notification or in-app message to specified tokens or user IDs.

- **Method**: `POST`
- **Path**: `/api/notifications/send`
- **Request Headers**:
  - `Content-Type`: `application/json` (Required)
- **Request Body**:
  | Field | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `token` | `string` | Conditional | Single target FCM device registration token. | `"dK39...x9"` |
  | `tokens` | `string[]` | Conditional | Array of FCM device tokens. | `["token1", "token2"]` |
  | `userIds` | `string[]` | Conditional | Array of user IDs whose tokens will be resolved from Firestore. | `["user_1", "user_2"]` |
  | `sendToAll` | `boolean` | Conditional | Set `true` to broadcast to all platform users. | `true` |
  | `notification` | `object` | No | Visible alert content (title, body, image). | See below |
  | `data` | `object` | No | Key-value pairs for silent or in-app handling. | See below |

#### Example Request Payloads

##### Push Notification to Specific Users
```json
{
  "userIds": ["user_101", "user_102"],
  "notification": {
    "title": "Match Starting Soon!",
    "body": "Arsenal vs Chelsea kicks off in 15 minutes.",
    "imageUrl": "https://storage.catchme.live/banners/match_101.png"
  },
  "data": {
    "type": "game_alert",
    "gameId": "game_101",
    "click_action": "FLUTTER_NOTIFICATION_CLICK"
  }
}
```

##### In-App Event (Data-only / Silent) to a Single Device Token
```json
{
  "token": "eX_fcm_token_example_1234567890",
  "data": {
    "action": "SYNC_FEED",
    "timestamp": "1756401000000"
  }
}
```

#### Responses

- **`200 OK`**: Notification successfully dispatched.
  ```json
  {
    "success": true,
    "message": "Notification sent successfully.",
    "messageId": {
      "successCount": 2,
      "failureCount": 0,
      "responses": [
        { "success": true, "messageId": "projects/catch-me-beta-dcff0/messages/0:1625..." }
      ]
    }
  }
  ```

- **`400 Bad Request`**: No valid recipient specified.
  ```json
  {
    "success": false,
    "message": "At least one recipient (token, tokens, userIds, or sendToAll) is required."
  }
  ```

- **`500 Internal Server Error`**: FCM service failure or no active device tokens found.
  ```json
  {
    "success": false,
    "message": "Failed to send notification.",
    "error": "No valid recipient tokens found."
  }
  ```

---

### 2. Broadcast Notification to All Users
Explicit broadcast endpoint that resolves all active FCM device tokens from the `users` collection and executes a multicast dispatch.

- **Method**: `POST`
- **Path**: `/api/notifications/send-all`
- **Request Headers**:
  - `Content-Type`: `application/json` (Required)
- **Request Body**:
  ```json
  {
    "notification": {
      "title": "Catch Me 2.0 is Live! 🚀",
      "body": "Check out new team leaderboards and AI summaries."
    },
    "data": {
      "type": "announcement",
      "version": "2.0.0"
    }
  }
  ```

#### Responses

- **`200 OK`**:
  ```json
  {
    "success": true,
    "message": "Notification sent to all users successfully.",
    "messageId": {
      "successCount": 1250,
      "failureCount": 12,
      "responses": []
    }
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "success": false,
    "message": "Failed to send notification to all users.",
    "error": "Firebase messaging multicast error"
  }
  ```

---

## Realtime Database Audit Logging

All notification actions are logged in Firebase Realtime Database:
- **Successful push alerts**: `/push-notifications/{pushId}`
- **Successful data events**: `/in-app-events/{pushId}`
- **Failed push alerts**: `/failed-push-notifications/{pushId}`
- **Failed data events**: `/failed-in-app-events/{pushId}`
