# User Routes (`/api/users`)

The Users module handles user profile queries, graph-based friend recommendations, Firestore prefix searches, ultra-fast local fuzzy searches, and deep user account deletion with multi-collection cascading cleanup.

---

## Base Path
```http
/api/users
```

---

## Endpoints

### 1. Get All Users
Retrieves a list of all user documents stored in the Firestore `users` collection.

- **Method**: `GET`
- **Path**: `/api/users/`
- **Request Headers**:
  - `x-session-id` *(string, optional)*: Client session ID for tracking.
- **Query Parameters**: None.
- **Request Body**: None.

#### Responses

- **`200 OK`**: Successfully retrieved users.
  ```json
  {
    "status": "SUCCESS",
    "data": [
      {
        "id": "user_abc123",
        "name": "Jane Doe",
        "username": "janedoe",
        "email": "jane@example.com",
        "role": "athlete",
        "level": 4,
        "xp": 1250,
        "country": "USA",
        "location": "New York",
        "sport": "Basketball",
        "favoriteSports": ["Basketball", "Tennis"],
        "followers": ["user_xyz789"],
        "following": ["user_456def"],
        "profilePic": "https://storage.catchme.live/profiles/user_abc123.jpg",
        "createdAt": "2026-01-15T08:30:00.000Z"
      }
    ]
  }
  ```

- **`500 Internal Server Error`**: Database error.
  ```json
  {
    "status": "FAILED",
    "error": "Failed to fetch users"
  }
  ```

---

### 2. Local Fuzzy Search Users
Performs high-speed in-memory fuzzy search across minified local user data (`users_min.json`) using Fuse.js. Matches against `name` and `username`.

- **Method**: `GET`
- **Path**: `/api/users/local-search`
- **Query Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `q` | `string` | **Yes** | Search term / partial string for name or username. | `?q=jane` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: Matching users returned.
  ```json
  {
    "status": "SUCCESS",
    "data": [
      {
        "id": "user_abc123",
        "name": "Jane Doe",
        "username": "janedoe",
        "role": "athlete",
        "avatar": "https://storage.catchme.live/profiles/user_abc123.jpg"
      }
    ]
  }
  ```

- **`400 Bad Request`**: Missing query parameter `q`.
  ```json
  {
    "status": "FAILED",
    "error": "Missing search query"
  }
  ```

- **`503 Service Unavailable`**: Minified user cache file (`users_min.json`) is not yet generated.
  ```json
  {
    "status": "FAILED",
    "error": "Search index not ready. Please try again later."
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "status": "FAILED",
    "error": "Local search failed"
  }
  ```

---

### 3. Search Users (Firestore Prefix)
Performs a prefix match search directly on Firestore `users` collection by the user's `name`.

- **Method**: `GET`
- **Path**: `/api/users/search`
- **Query Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `q` | `string` | **Yes** | Prefix query string. | `?q=Jan` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: Array of user documents matching the prefix.
  ```json
  {
    "status": "SUCCESS",
    "data": [
      {
        "id": "user_abc123",
        "name": "Jane Doe",
        "username": "janedoe",
        "role": "athlete",
        "email": "jane@example.com"
      }
    ]
  }
  ```

- **`400 Bad Request`**:
  ```json
  {
    "status": "FAILED",
    "error": "Missing search query"
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "status": "FAILED",
    "error": "Search failed"
  }
  ```

---

### 4. Get User by ID
Fetches the complete profile and metadata for a specific user.

- **Method**: `GET`
- **Path**: `/api/users/:id`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Firestore Document ID of the user. | `user_abc123` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: User profile found.
  ```json
  {
    "status": "SUCCESS",
    "id": "user_abc123",
    "name": "Jane Doe",
    "username": "janedoe",
    "email": "jane@example.com",
    "role": "athlete",
    "level": 4,
    "xp": 1250,
    "followers": ["user_xyz789"],
    "following": ["user_456def"],
    "likedPosts": ["post_001", "post_002"],
    "savedPosts": ["post_005"],
    "profilePic": "https://storage.catchme.live/profiles/user_abc123.jpg",
    "createdAt": "2026-01-15T08:30:00.000Z"
  }
  ```

- **`404 Not Found`**:
  ```json
  {
    "status": "FAILED",
    "error": "User not found"
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "status": "FAILED",
    "error": "Failed to fetch user"
  }
  ```

---

### 5. Delete User (Cascading Cleanup)
Deletes the user and removes all traces across the database in an atomic batch operation:
1. Removes user ID from `followers`, `following`, and `blockedUsers` arrays of all other users.
2. Removes user ID from `likes`, `shares`, and `saves` arrays of all posts.
3. Deletes all posts created by the user (`userId == id`).
4. Removes user from `data.players` and `data.votes.userVotes` in the `events` collection.
5. Deletes all chat sessions in the `chats` collection where user is a member.
6. Deletes the primary user document from `users`.

- **Method**: `DELETE`
- **Path**: `/api/users/:id`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Firestore Document ID of the user to delete. | `user_abc123` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: User and references deleted.
  ```json
  {
    "status": "SUCCESS",
    "message": "User and all their traces deleted successfully"
  }
  ```

- **`404 Not Found`**:
  ```json
  {
    "status": "FAILED",
    "error": "User not found"
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "status": "FAILED",
    "error": "Failed to delete user",
    "details": "Specific Firestore batch error message"
  }
  ```

---

### 6. Get User Suggestions ("You May Know")
Generates "You May Know" graph-based recommendations using 2nd-degree network traversal (users followed by the people the user follows, ranked by mutual connection count).

- **Method**: `GET`
- **Path**: `/api/users/:id/suggestions`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Target user's Firestore Document ID. | `user_abc123` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: Suggested user recommendations sorted by mutual connection count.
  ```json
  {
    "status": "SUCCESS",
    "data": [
      {
        "id": "user_rec999",
        "name": "Alex Johnson",
        "username": "alexj",
        "avatar": "https://storage.catchme.live/profiles/alexj.jpg",
        "mutualCount": 5
      },
      {
        "id": "user_rec888",
        "name": "Chris Paul",
        "username": "cp3",
        "avatar": "https://storage.catchme.live/profiles/cp3.jpg",
        "mutualCount": 2
      }
    ]
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "status": "FAILED",
    "error": "Failed to get suggestions"
  }
  ```
