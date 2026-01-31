# 🔌 API Specification - Sudoku Game

> **Version**: 1.0  
> **Base URL**: `http://localhost:3001/api`  
> **Last Updated**: January 20, 2026

---

## 🔐 Authentication

### POST /auth/anonymous
Tạo anonymous session để chơi không cần đăng ký.

**Request Body:** None

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "displayName": "Player",
    "isAnonymous": true,
    "eloRating": 1000,
    "gamesPlayed": 0,
    "gamesWon": 0
  }
}
```

---

### POST /auth/register
Đăng ký tài khoản mới.

**Request Body:**
```json
{
  "username": "player1",
  "password": "securepassword",
  "displayName": "Player One"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "player1",
    "displayName": "Player One",
    "isAnonymous": false
  }
}
```

**Errors:**
- `400` - Username already exists

---

### POST /auth/login
Đăng nhập với username/password.

**Request Body:**
```json
{
  "username": "player1",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "player1",
    "displayName": "Player One",
    "isAnonymous": false,
    "eloRating": 1250,
    "gamesPlayed": 50,
    "gamesWon": 35
  }
}
```

**Errors:**
- `401` - Invalid credentials

---

### POST /auth/migrate
Migrate data từ anonymous sang registered account.

**Headers:** `Authorization: Bearer <anonymous_token>`

**Request Body:**
```json
{
  "username": "player1",
  "password": "securepassword",
  "displayName": "Player One"
}
```

**Response:** Same as register

---

### GET /auth/profile
Lấy thông tin user hiện tại.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "uuid",
  "username": "player1",
  "displayName": "Player One",
  "isAnonymous": false,
  "eloRating": 1250,
  "gamesPlayed": 50,
  "gamesWon": 35,
  "bestTimeEasy": 180,
  "bestTimeNormal": 420,
  "bestTimeHard": 900,
  "competitiveWins": 20,
  "competitiveLosses": 10,
  "competitiveDraws": 5
}
```

---

## 🎮 Game Management

### POST /games
Tạo game mới.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "difficulty": "easy" | "normal" | "hard"
}
```

**Response:**
```json
{
  "id": "game-uuid",
  "puzzle": [[0,5,0,...], ...],
  "currentGrid": [[0,5,0,...], ...],
  "solution": [[1,5,3,...], ...],
  "difficulty": "easy",
  "mistakes": 0,
  "hintsUsed": 0,
  "hintedCells": [],
  "moveHistory": [],
  "status": "ACTIVE",
  "elapsedTime": 0,
  "createdAt": "2026-01-20T10:00:00Z"
}
```

---

### GET /games/:id
Lấy thông tin game.

**Headers:** `Authorization: Bearer <token>`

**Response:** Same as POST /games

---

### GET /games/active
Lấy game đang chơi (nếu có).

**Headers:** `Authorization: Bearer <token>`

**Response:** Game object or `null`

---

### POST /games/:id/move
Đánh nước đi.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "row": 0,
  "col": 2,
  "value": 3,
  "isNote": false
}
```

**Response:**
```json
{
  "success": true,
  "isCorrect": true,
  "game": { ... },
  "isComplete": false
}
```

---

### POST /games/:id/undo
Undo nước đi cuối.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "game": { ... }
}
```

---

### POST /games/:id/hint
Sử dụng hint.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "type": "reveal_cell" | "show_conflicts" | "highlight_suggestion",
  "data": {
    "row": 2,
    "col": 5,
    "value": 7
  }
}
```

---

### PUT /games/:id/time
Cập nhật thời gian đã chơi.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "elapsedTime": 120
}
```

---

### DELETE /games/:id
Abandon game hiện tại.

**Headers:** `Authorization: Bearer <token>`

---

## 🏆 Leaderboard

### GET /leaderboard/solo
Lấy solo leaderboard.

**Query Params:**
- `type`: `best_time_easy` | `best_time_normal` | `best_time_hard` | `most_wins`
- `limit`: number (default: 10)

**Response:**
```json
{
  "type": "best_time_easy",
  "entries": [
    {
      "rank": 1,
      "userId": "uuid",
      "displayName": "Pro Player",
      "value": 120,
      "formattedValue": "2:00"
    }
  ]
}
```

---

### GET /leaderboard/competitive
Lấy competitive leaderboard.

**Query Params:**
- `type`: `elo` | `wins` | `win_rate`
- `limit`: number (default: 10)

**Response:**
```json
{
  "type": "elo",
  "entries": [
    {
      "rank": 1,
      "userId": "uuid",
      "displayName": "Champion",
      "eloRating": 1850,
      "competitiveWins": 100,
      "competitiveLosses": 20
    }
  ]
}
```

---

## 🔗 WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:3001', {
  auth: { token: 'Bearer <jwt_token>' }
});
```

### Game Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `game:join` | Client → Server | `{ gameId: string }` |
| `game:state` | Server → Client | `{ game: GameObject }` |
| `game:move` | Client → Server | `{ gameId, row, col, value }` |
| `game:complete` | Server → Client | `{ game, stats }` |

### Match Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `match:create` | Client → Server | `{ difficulty: string }` |
| `match:created` | Server → Client | `{ match, roomCode }` |
| `match:join` | Client → Server | `{ roomCode: string }` |
| `match:joined` | Server → Client | `{ match }` |
| `match:ready` | Client → Server | `{ matchId: string }` |
| `match:start` | Server → Client | `{ match, puzzle }` |
| `match:progress` | Both | `{ matchId, progress }` |
| `match:complete` | Server → Client | `{ winner, eloChanges }` |
| `match:rematch` | Client → Server | `{ matchId: string }` |

