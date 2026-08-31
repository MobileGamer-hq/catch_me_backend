# Catch Me Backend API Documentation

Welcome to the API documentation for the **Catch Me Backend** service. This backend powers the Catch Me sports platform, delivering real-time game tracking, intelligent feed recommendations, leaderboards, global search, push notifications, and AI-powered match summaries.

---

## 🌐 Server & Base URLs

- **Local Development**: `http://localhost:5000`
- **Production Primary**: `https://api.catchme.live`
- **Production Secondary**: `https://api2.catchme.live`

---

## 📄 OpenAPI 3.0 Specification

Interactive and machine-readable OpenAPI 3.0 definitions are available in both YAML and JSON formats:
- **YAML Specification**: [**`openapi.yaml`**](../openapi.yaml) (or [`documentation/openapi.yaml`](./openapi.yaml))
- **JSON Specification**: [**`openapi.json`**](../openapi.json) (or [`documentation/openapi.json`](./openapi.json))

You can import these files directly into **Swagger UI**, **Postman**, **Redoc**, **Insomnia**, or code-generation tools.

---

## 🧩 Global Request Headers & Middleware

All routes support and process the following headers where applicable:

| Header | Type | Required | Description |
|---|---|---|---|
| `Content-Type` | `string` | For POST/PUT | Must be `application/json` for requests containing a JSON payload. |
| `x-session-id` | `string` | Optional | Custom session identifier used by `sessionContext` middleware. Automatically assigns A/B test bucket (`A` or `B`) and personalizes feed generation. Defaults to `"default"`. |
| `Authorization` | `string` | Optional | Bearer token for authenticated requests (e.g., `Bearer <token>`). |

---

## 📋 Available Route Modules

Click on any route module below for detailed documentation on all its endpoints, expected request headers and bodies, query parameters, status codes, and response schemas:

| Route Prefix | Module | Description | Documentation File |
|---|---|---|---|
| `/` & `/ping` | **System / Health** | Server status and health check endpoints | [Overview](#system--health-endpoints) |
| `/api/users` | **User Management** | User profiles, suggestions, deletion with cascading cleanup, Firestore & local fuzzy search | [users.md](./users.md) |
| `/api/feed` | **Feed System** | Personalized dynamic feeds and granular content feeds (posts, games, popular, suggestions) | [feed.md](./feed.md) |
| `/api/games` | **Games & Match Engine** | Game data, sport standardization, PDF reports, AI match commentaries (Gemini / Grok) | [games.md](./games.md) |
| `/api/events` | **Events Management** | Event retrieval, type filtering, cascading cleanup deletion, local fuzzy search | [events.md](./events.md) |
| `/api/posts` | **Posts Management** | Post retrieval, cascading deletion across user interactions, local post search | [posts.md](./posts.md) |
| `/api/engage` | **Engagement Tracking** | Dwell time, view counts, and interaction click signals for posts and games | [engagement.md](./engagement.md) |
| `/api/leaderboard`| **Leaderboard & Rankings**| Real-time cached user rankings by sport, role, location, country, and region | [leaderboard.md](./leaderboard.md) |
| `/api/notifications`| **Notifications Engine** | Targeted FCM push notifications, multicast messaging, and broadcast to all users | [notifications.md](./notifications.md) |
| `/api/search` | **Global Search** | Unified multi-entity search across users, teams, and hashtags | [search.md](./search.md) |

---

## 🚦 System & Health Endpoints

### 1. Root Service Info
- **Method**: `GET`
- **Path**: `/`
- **Description**: Verifies the service is alive and returns the service name.
- **Headers**: None required.
- **Query / Body**: None.
- **Response**:
  - `200 OK`:
  ```json
  {
    "status": "SUCCESS",
    "message": "Catch Me Backend"
  }
  ```

### 2. Ping Health Check
- **Method**: `GET`
- **Path**: `/ping`
- **Description**: Lightweight health probe for load balancers and container orchestrators.
- **Headers**: None required.
- **Query / Body**: None.
- **Response**:
  - `200 OK`:
  ```json
  {
    "status": "SUCCESS",
    "message": "Pong!"
  }
  ```

---

## ⚠️ Standard Error Responses

Unless otherwise specified in route documents, errors follow standard HTTP status codes with JSON error payloads featuring `status: "FAILED"`:

### 400 Bad Request
```json
{
  "status": "FAILED",
  "error": "Missing required fields"
}
```

### 404 Not Found
```json
{
  "status": "FAILED",
  "error": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "status": "FAILED",
  "error": "Failed to process request",
  "details": "Specific internal error message"
}
```

### 503 Service Unavailable
```json
{
  "status": "FAILED",
  "error": "Search index not ready. Please try again later."
}
```
