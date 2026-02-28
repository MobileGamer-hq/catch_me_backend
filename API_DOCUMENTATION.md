# Catch Me API Documentation

This document outlines the available API endpoints for the Catch Me backend, including the required request bodies and response formats.

- **Base URL**: `https://app.catchme.live/api` (Production) or `http://localhost:5000/api` (Local)
- **Format**: All requests and responses use JSON.

---

## 1. User Management (`/api/users`)

### Get All Users

- **Method**: `GET`
- **Endpoint**: `/`
- **Description**: Returns a list of all users from Firestore.
- **Response**: `200 OK`
  ```json
  [
    { "id": "user123", "name": "John Doe", "email": "john@example.com", ... },
    ...
  ]
  ```

### Get User by ID

- **Method**: `GET`
- **Endpoint**: `/:id`
- **Description**: Returns the details of a specific user.
- **Response**: `200 OK`
  ```json
  { "id": "user123", "name": "John Doe", "email": "john@example.com", ... }
  ```
- **Errors**: `404 Not Found` if the user doesn't exist.

### Search Users

- **Method**: `GET`
- **Endpoint**: `/search?q={query}`
- **Description**: Searches for users by name (prefix match).
- **Response**: `200 OK`
  ```json
  [
    { "id": "user123", "name": "John Doe", ... }
  ]
  ```

### Get User Suggestions

- **Method**: `GET`
- **Endpoint**: `/:id/suggestions`
- **Description**: Returns "You May Know" user recommendations for the given user ID.
- **Response**: `200 OK`
  ```json
  [
    { "id": "user456", "name": "Jane Smith", ... }
  ]
  ```

---

## 2. Events & Games (`/api/events`)

### Get All Events

- **Method**: `GET`
- **Endpoint**: `/`
- **Description**: Returns a list of all events/games.
- **Response**: `200 OK`
  ```json
  [
    { "id": "event123", "type": "game", "title": "Friday Match", ... },
    ...
  ]
  ```

### Get Event by ID

- **Method**: `GET`
- **Endpoint**: `/:id`
- **Description**: Returns details for a specific event or game.
- **Response**: `200 OK`
  ```json
  { "id": "event123", "type": "game", "title": "Friday Match", ... }
  ```

### Update Event

- **Method**: `PUT` (Mapped via `app.use`)
- **Endpoint**: `/:id`
- **Description**: Updates fields of an existing event.
- **Request Body**:
  ```json
  {
    "title": "Updated Title",
    "description": "New description..."
  }
  ```
- **Response**: `200 OK`
  ```json
  { "message": "Event updated successfully" }
  ```

### Delete Event

- **Method**: `DELETE`
- **Endpoint**: `/:id`
- **Description**: Deletes an event by ID.
- **Response**: `200 OK`
  ```json
  { "message": "Event deleted successfully" }
  ```

---

## 3. Feed (`/api/feed`)

### Get User Feed

- **Method**: `GET`
- **Endpoint**: `/:id`
- **Description**: Generates a personalized feed (posts and games) for a specific user.
- **Response**: `200 OK`
  ```json
  [
    { "id": "post1", "type": "post", "content": "Hello world", ... },
    { "id": "game1", "type": "game", "title": "Big Game", ... }
  ]
  ```

---

## 4. Engagement (`/api/engage`)

### Record Engagement Signal

- **Method**: `POST`
- **Endpoint**: `/signal`
- **Description**: Records user engagement (dwell time or clicks) for a post or game.
- **Request Body**:
  ```json
  {
    "type": "dwell" | "click",
    "targetId": "post_or_game_id",
    "targetType": "post" | "game",
    "value": 5000 // (optional) milliseconds for dwell time
  }
  ```
- **Response**: `200 OK`
  ```json
  { "success": true }
  ```

---

## 5. Leaderboard (`/api/leaderboard`)

### Get Rankings

- **Method**: `GET`
- **Endpoint**: `/?role=athlete&country=Nigeria&limit=50&page=1`
- **Description**: Returns a ranked list of users based on various filters.
- **Query Parameters**:
  - `role`: (string) Filter by user role (e.g., `athlete`, `scout`).
  - `country`: (string) Filter by country.
  - `region`: (string) Filter by region.
  - `location`: (string) Filter by city/location.
  - `sport`: (string) Filter by sport type.
  - `limit`: (number) Results per page (default: 50).
  - `page`: (number) Page number (default: 1).
- **Response**: `200 OK`
  ```json
  {
    "rankings": [...],
    "page": 1,
    "limit": 50
  }
  ```
