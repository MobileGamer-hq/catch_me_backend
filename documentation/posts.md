# Post Routes (`/api/posts`)

The Posts module handles post queries, fast local fuzzy search across captions and hashtags, and cascading deletion of posts and their interactions (likes, saves, creator arrays).

---

## Base Path
```http
/api/posts
```

---

## Endpoints

### 1. Local Fuzzy Search Posts
Performs fast in-memory fuzzy search across minified local post data (`posts_min.json`) using Fuse.js. Matches against `caption` and `tags`.

- **Method**: `GET`
- **Path**: `/api/posts/local-search`
- **Query Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `q` | `string` | **Yes** | Search keyword matching caption or hashtags. | `?q=dunk` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: List of matched posts.
  ```json
  [
    {
      "id": "post_789",
      "caption": "Insane dunk in the 4th quarter! #basketball #dunk",
      "tags": ["basketball", "dunk"],
      "userId": "user_ath01",
      "type": "highlight"
    }
  ]
  ```

- **`400 Bad Request`**:
  ```json
  {
    "error": "Missing search query"
  }
  ```

- **`503 Service Unavailable`**: Minified post index is not yet built.
  ```json
  {
    "error": "Search index not ready. Please try again later."
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Local search failed"
  }
  ```

---

### 2. Get User Post Feed
Retrieves the recommended post feed for a given user ID.

- **Method**: `GET`
- **Path**: `/api/posts/:id`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | User ID for whom the feed is generated. | `user_123` |
- **Query Parameters**:
  | Parameter | Type | Required | Default | Allowed Values |
  |---|---|---|---|---|
  | `filter` | `string` | No | `all` | `all`, `followers`, `trending`, `suggested` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: Complete categorized feed object.
  ```json
  {
    "posts": {
      "highlights": [],
      "images": [],
      "thoughts": []
    },
    "games": [],
    "suggestedUsers": [],
    "upcomingGames": [],
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

### 3. Delete Post (Cascading Cleanup)
Deletes a post and cleans up all user references in an atomic batch operation:
1. Removes post ID from `likedPosts` of all users who liked it.
2. Removes post ID from `savedPosts` of all users who saved it.
3. Removes post ID from the creator's `posts` array.
4. Deletes the post document from the `posts` collection.

- **Method**: `DELETE`
- **Path**: `/api/posts/:id`
- **Path Parameters**:
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | `string` | **Yes** | Firestore Document ID of the post to delete. | `post_789` |
- **Request Body**: None.

#### Responses

- **`200 OK`**: Post and traces removed.
  ```json
  {
    "message": "Post and its traces deleted successfully"
  }
  ```

- **`404 Not Found`**:
  ```json
  {
    "error": "Post not found"
  }
  ```

- **`500 Internal Server Error`**:
  ```json
  {
    "error": "Failed to delete post",
    "details": "Firestore error message"
  }
  ```
