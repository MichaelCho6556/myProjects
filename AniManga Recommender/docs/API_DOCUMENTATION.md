# AniManga Recommender API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:5000` (Development) | `https://your-domain.com` (Production)  
**Content-Type:** `application/json`

## Table of Contents

- [Authentication](#authentication)
- [Public Endpoints](#public-endpoints)
- [Protected Endpoints](#protected-endpoints)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication

The AniManga Recommender API uses JWT (JSON Web Token) authentication for protected endpoints.

### Authentication Flow

1. User signs in through Supabase authentication
2. Client receives JWT token from Supabase
3. Include token in `Authorization` header for protected endpoints

### Header Format

```
Authorization: Bearer <jwt_token>
```

### Token Validation

- Tokens are validated against Supabase authentication service
- Tokens expire based on Supabase configuration (typically 1 hour)
- Use Supabase refresh tokens to obtain new access tokens

---

## Public Endpoints

### 1. Health Check

**Endpoint:** `GET /`

**Description:** Check API health and dataset status

**Parameters:** None

**Response:**

```
Content-Type: text/plain
Status: 200 OK

"Hello from AniManga Recommender Backend! Loaded 68598 items from Supabase."
```

---

### 2. Get Items with Filtering

**Endpoint:** `GET /api/items`

**Description:** Retrieve paginated list of anime/manga items with advanced filtering

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number for pagination |
| `per_page` | integer | No | 30 | Items per page (max: 100) |
| `q` | string | No | - | Search query for titles |
| `media_type` | string | No | all | Filter by 'anime' or 'manga' |
| `genre` | string | No | - | Comma-separated genre filters |
| `theme` | string | No | - | Comma-separated theme filters |
| `demographic` | string | No | - | Comma-separated demographic filters |
| `studio` | string | No | - | Comma-separated studio filters |
| `author` | string | No | - | Comma-separated author filters |
| `status` | string | No | - | Broadcasting/publication status |
| `min_score` | float | No | - | Minimum score filter (0.0-10.0) |
| `year` | integer | No | - | Release year filter |
| `sort_by` | string | No | score_desc | Sorting method |

**Sort Options:**

- `score_desc`: Score (High to Low)
- `score_asc`: Score (Low to High)
- `title_asc`: Title (A-Z)
- `title_desc`: Title (Z-A)
- `popularity_desc`: Popularity
- `start_date_desc`: Release Date (Newest)
- `start_date_asc`: Release Date (Oldest)

**Example Request:**

```
GET /api/items?q=naruto&genre=Action,Adventure&media_type=anime&min_score=8.0&page=1&per_page=20&sort_by=score_desc
```

**Example Response:**

```json
{
  "items": [
    {
      "uid": "anime_20",
      "title": "Naruto",
      "media_type": "anime",
      "score": 8.4,
      "genres": ["Action", "Adventure", "Martial Arts"],
      "themes": ["Ninja", "Friendship"],
      "demographics": ["Shounen"],
      "main_picture": "https://example.com/naruto.jpg",
      "synopsis": "Naruto Uzumaki, a young ninja...",
      "status": "Finished Airing",
      "episodes": 220,
      "start_date": "2002-10-03",
      "end_date": "2007-02-08"
    }
  ],
  "page": 1,
  "per_page": 20,
  "total_items": 156,
  "total_pages": 8,
  "sort_by": "score_desc"
}
```

---

### 3. Get Distinct Filter Values

**Endpoint:** `GET /api/distinct-values`

**Description:** Get available filter options for dropdowns

**Parameters:** None

**Response:**

```json
{
  "genres": ["Action", "Adventure", "Comedy", "Drama", ...],
  "themes": ["School", "Military", "Magic", "Romance", ...],
  "demographics": ["Shounen", "Seinen", "Shoujo", "Josei"],
  "studios": ["MAPPA", "Toei Animation", "Studio Ghibli", ...],
  "authors": ["Eiichiro Oda", "Masashi Kishimoto", ...],
  "statuses": ["Finished Airing", "Currently Airing", "Not yet aired"],
  "media_types": ["anime", "manga"]
}
```

---

### 4. Get Item Details

**Endpoint:** `GET /api/items/<item_uid>`

**Description:** Get detailed information for a specific item

**Parameters:**

- `item_uid` (path): Unique identifier for the item

**Example Request:**

```
GET /api/items/anime_20
```

**Example Response:**

```json
{
  "uid": "anime_20",
  "title": "Naruto",
  "media_type": "anime",
  "score": 8.4,
  "genres": ["Action", "Adventure", "Martial Arts"],
  "themes": ["Ninja", "Friendship"],
  "demographics": ["Shounen"],
  "studios": ["Studio Pierrot"],
  "main_picture": "https://example.com/naruto.jpg",
  "synopsis": "Naruto Uzumaki, a young ninja with a sealed demon fox spirit...",
  "status": "Finished Airing",
  "episodes": 220,
  "duration": 24,
  "start_date": "2002-10-03",
  "end_date": "2007-02-08",
  "source": "Manga",
  "rating": "PG-13"
}
```

---

### 5. Get Recommendations

**Endpoint:** `GET /api/recommendations/<item_uid>`

**Description:** Get content-based recommendations for an item

**Parameters:**

- `item_uid` (path): Unique identifier for the source item

**Example Request:**

```
GET /api/recommendations/anime_20
```

**Example Response:**

```json
{
  "source_item": {
    "uid": "anime_20",
    "title": "Naruto",
    "media_type": "anime"
  },
  "recommendations": [
    {
      "uid": "anime_21",
      "title": "Naruto: Shippuden",
      "similarity_score": 0.95,
      "score": 8.7,
      "genres": ["Action", "Adventure", "Martial Arts"],
      "main_picture": "https://example.com/naruto-shippuden.jpg"
    },
    {
      "uid": "anime_1735",
      "title": "Naruto: Shippuuden Movie 6 - Road to Ninja",
      "similarity_score": 0.89,
      "score": 7.68,
      "genres": ["Action", "Adventure", "Martial Arts"],
      "main_picture": "https://example.com/movie6.jpg"
    }
  ]
}
```

---

## Protected Endpoints

All protected endpoints require valid JWT authentication.

### 1. Get User Profile

**Endpoint:** `GET /api/auth/profile`

**Description:** Get current user's profile information

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "username": "otaku_user",
  "display_name": "Anime Fan",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:45:00Z"
}
```

---

### 2. Update User Profile

**Endpoint:** `PUT /api/auth/profile`

**Description:** Update user profile information

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "username": "new_username",
  "display_name": "New Display Name"
}
```

**Response:**

```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "username": "new_username",
    "display_name": "New Display Name",
    "updated_at": "2024-01-20T15:00:00Z"
  }
}
```

---

### 3. Get Dashboard Data

**Endpoint:** `GET /api/auth/dashboard`

**Description:** Get comprehensive dashboard data for the user

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "user_stats": {
    "total_anime_watched": 42,
    "total_manga_read": 18,
    "total_hours_watched": 504.2,
    "total_chapters_read": 1250,
    "average_score": 8.3,
    "favorite_genres": ["Action", "Adventure", "Comedy"],
    "current_streak_days": 7,
    "longest_streak_days": 23,
    "completion_rate": 85.5
  },
  "recent_activity": [
    {
      "id": "activity_1",
      "activity_type": "completed",
      "item_uid": "anime_123",
      "item_title": "Attack on Titan",
      "created_at": "2024-01-20T14:30:00Z"
    }
  ],
  "in_progress": [
    {
      "item_uid": "anime_456",
      "title": "One Piece",
      "status": "watching",
      "progress": 1000,
      "total_episodes": 1100,
      "updated_at": "2024-01-20T12:00:00Z"
    }
  ],
  "quick_stats": {
    "watching_count": 5,
    "plan_to_watch_count": 23,
    "completed_this_month": 3,
    "avg_score_this_month": 8.7
  }
}
```

---

### 4. Get User Items

**Endpoint:** `GET /api/auth/user-items`

**Description:** Get user's anime/manga list items

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status (watching, completed, plan_to_watch, etc.) |

**Example Request:**

```
GET /api/auth/user-items?status=watching
```

**Response:**

```json
{
  "items": [
    {
      "id": "user_item_1",
      "item_uid": "anime_456",
      "status": "watching",
      "progress": 1000,
      "rating": 9.0,
      "notes": "Amazing series!",
      "start_date": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-20T12:00:00Z",
      "item_details": {
        "title": "One Piece",
        "media_type": "anime",
        "main_picture": "https://example.com/onepiece.jpg"
      }
    }
  ]
}
```

---

### 5. Update User Item Status

**Endpoint:** `POST /api/auth/user-items/<item_uid>`  
**Endpoint:** `PUT /api/auth/user-items/<item_uid>`

**Description:** Add or update an item in user's list

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Parameters:**

- `item_uid` (path): Unique identifier for the item

**Request Body:**

```json
{
  "status": "watching",
  "progress": 150,
  "rating": 8.5,
  "notes": "Really enjoying this series!"
}
```

**Response:**

```json
{
  "message": "Item updated successfully",
  "item": {
    "id": "user_item_1",
    "item_uid": "anime_456",
    "status": "watching",
    "progress": 150,
    "rating": 8.5,
    "notes": "Really enjoying this series!",
    "updated_at": "2024-01-20T15:30:00Z"
  }
}
```

---

### 6. Remove User Item

**Endpoint:** `DELETE /api/auth/user-items/<item_uid>`

**Description:** Remove an item from user's list

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `item_uid` (path): Unique identifier for the item

**Response:**

```json
{
  "message": "Item removed from your list successfully"
}
```

---

### 7. Verify Token

**Endpoint:** `GET /api/auth/verify-token`

**Description:** Verify if the current token is valid

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "valid": true,
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "expires_at": "2024-01-20T16:30:00Z"
}
```

---

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong",
  "details": "Additional details (optional)",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Status Code | Description           | Example                                   |
| ----------- | --------------------- | ----------------------------------------- |
| 200         | Success               | Request completed successfully            |
| 201         | Created               | Resource created successfully             |
| 400         | Bad Request           | Invalid parameters or malformed request   |
| 401         | Unauthorized          | Missing or invalid authentication token   |
| 403         | Forbidden             | Valid token but insufficient permissions  |
| 404         | Not Found             | Resource not found                        |
| 429         | Too Many Requests     | Rate limit exceeded                       |
| 500         | Internal Server Error | Server error occurred                     |
| 503         | Service Unavailable   | Dataset not loaded or service maintenance |

### Common Error Responses

**Authentication Error:**

```json
{
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**Invalid Token:**

```json
{
  "error": "Invalid or expired token",
  "code": "TOKEN_INVALID"
}
```

**Rate Limit Exceeded:**

```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

**Dataset Unavailable:**

```json
{
  "error": "Dataset not available",
  "code": "SERVICE_UNAVAILABLE"
}
```

---

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Authenticated Users:** 60 requests per minute
- **Anonymous Users:** 30 requests per minute
- **Headers:** Rate limit information included in response headers:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Time when rate limit resets

### Rate Limit Headers Example

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642694400
```

---

## Data Models

### Item Object

```typescript
interface Item {
  uid: string;
  title: string;
  media_type: "anime" | "manga";
  score?: number;
  genres?: string[];
  themes?: string[];
  demographics?: string[];
  studios?: string[];
  authors?: string[];
  main_picture?: string;
  synopsis?: string;
  status?: string;
  episodes?: number;
  chapters?: number;
  volumes?: number;
  duration?: number;
  start_date?: string;
  end_date?: string;
  source?: string;
  rating?: string;
}
```

### User Item Object

```typescript
interface UserItem {
  id: string;
  item_uid: string;
  status: "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch";
  progress: number;
  rating?: number;
  notes?: string;
  start_date?: string;
  completion_date?: string;
  created_at: string;
  updated_at: string;
}
```

---

**Last Updated:** January 2024  
**API Version:** 1.0.0
