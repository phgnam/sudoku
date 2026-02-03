# System Architecture

> **Last Updated**: February 2, 2026

## High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                       │
│  Next.js 16 (App Router) + React 19 + Zustand + Tailwind│
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Pages   │  │Components│  │  Stores  │               │
│  │ (10 app  │──│ (50+ UI) │──│(5 Zustand│               │
│  │  routes) │  │          │  │ persist) │               │
│  └────┬─────┘  └──────────┘  └────┬─────┘               │
│       │                           │                       │
│  ┌────┴─────────────┐  ┌────────┴──────────┐            │
│  │   13 Custom      │  │  API Client       │            │
│  │   Hooks          │  │  (fetchApi +      │            │
│  │                  │  │   auto-refresh)   │            │
│  └────┬─────────────┘  └────────┬──────────┘            │
│       │                         │                         │
│  ┌────┴────────────────────────┴──────┐                  │
│  │         Socket.io Client           │                  │
│  │   (WebSocket + polling fallback)   │                  │
│  └────────────────┬───────────────────┘                  │
└───────────────────┼───────────────────────────────────────┘
                    │ HTTP + WebSocket
┌───────────────────┼───────────────────────────────────────┐
│                   │      SERVER                            │
│  NestJS 11 + TypeORM + SQLite + Socket.io                 │
│                   │                                        │
│  ┌────────────────┴──────────────────┐                    │
│  │       Socket.io Gateway           │                    │
│  │  (JWT validation, rate limiting,  │                    │
│  │   48+ events, room broadcasting)  │                    │
│  └───────┬──────────┬────────────────┘                    │
│          │          │                                      │
│  ┌───────┴──┐ ┌─────┴────┐ ┌──────────┐ ┌────────────┐  │
│  │  Auth    │ │  Game    │ │  Match   │ │Leaderboard │  │
│  │ Module   │ │ Module   │ │ Module   │ │  Module    │  │
│  │ (JWT,    │ │(Sudoku,  │ │(ELO,    │ │ (Rankings) │  │
│  │ bcrypt)  │ │ Hint,    │ │Matchmake│ │            │  │
│  │          │ │ Mutation)│ │ Manager) │ │            │  │
│  └───┬──────┘ └────┬────┘ └────┬────┘ └──────┬─────┘  │
│      │             │           │              │          │
│  ┌───┴─────────────┴───────────┴──────────────┴───────┐  │
│  │              TypeORM + SQLite                       │  │
│  │  ┌──────┐ ┌───────┐ ┌──────┐ ┌────────┐ ┌──────┐  │  │
│  │  │User  │ │Puzzle │ │Game  │ │History │ │Match │  │  │
│  │  └──────┘ └───────┘ └──────┘ └────────┘ └──────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Backend Module Dependencies

```
AppModule
├── ConfigModule (global env vars)
├── I18nModule (global, fallback: en)
├── DatabaseModule (TypeORM + SQLite)
│   └── exports: 5 entity repositories
├── PuzzleModule
│   ├── depends: DatabaseModule (Puzzle repo)
│   └── exports: SudokuGeneratorService, TripodPuzzleService
├── AuthModule
│   ├── depends: DatabaseModule (User repo), JwtModule
│   └── exports: AuthService, JwtAuthGuard
├── GameModule
│   ├── depends: DatabaseModule (Game, GameHistory, User, Puzzle repos)
│   ├── depends: PuzzleModule (generator)
│   └── exports: GameService, HintService, SudokuValidatorService
├── MatchModule
│   ├── depends: DatabaseModule (Match, User repos)
│   └── exports: MatchService, EloService, MatchmakingService
├── LeaderboardModule
│   ├── depends: DatabaseModule (GameHistory, User repos)
│   └── exports: LeaderboardService
└── GatewayModule
    ├── depends: AuthModule (JWT validation)
    ├── depends: GameModule (game operations)
    ├── depends: MatchModule (match lifecycle)
    └── exports: GameGateway
```

## Frontend Data Flow

```
User Interaction
      │
      ▼
┌──────────┐    ┌──────────────┐    ┌──────────────┐
│  Page    │───▶│  Custom Hook │───▶│ Zustand Store│
│ Component│    │  (13 hooks)  │    │  (5 stores)  │
└──────────┘    └──────┬───────┘    └──────┬───────┘
                       │                    │
              ┌────────┴─────┐    ┌────────┴────────┐
              │ Socket.io    │    │  localStorage   │
              │ (real-time)  │    │  (persistence)  │
              └──────┬───────┘    └─────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │  API Client  │
              │  (fetchApi)  │
              └──────┬───────┘
                     │
                     ▼
              NestJS Backend
```

## Authentication Flow

```
First Visit
    │
    ▼
┌──────────────────┐     ┌──────────────────┐
│  POST /auth/     │────▶│ JWT Token (30d)  │
│  anonymous       │     │ + User (anon)    │
└──────────────────┘     └────────┬─────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
                    ▼                            ▼
         ┌──────────────┐             ┌──────────────────┐
         │  Play Games  │             │ POST /auth/      │
         │  (anonymous) │             │ register         │
         └──────────────┘             └────────┬─────────┘
                                               │
                                               ▼
                                    ┌──────────────────┐
                                    │ POST /auth/      │
                                    │ migrate          │
                                    │ (data preserved) │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │ JWT Token (7d)   │
                                    │ + User (reg)     │
                                    └──────────────────┘

Token Refresh: Auto on 401 via fetchApi interceptor, and proactive refresh 5 minutes before expiry
Cross-tab: BroadcastChannel API syncs auth state
```

## Game Lifecycle

```
Home Page                    Backend
    │                           │
    │  POST /games              │
    │  {difficulty, gameMode}   │
    ├──────────────────────────▶│ Abandon existing active game
    │                           │ Fetch random puzzle
    │      Game state           │ Create Game entity
    │◀──────────────────────────┤
    │                           │
    │  Socket: game:join        │
    ├──────────────────────────▶│ Join room (game:userId)
    │                           │
    ▼                           │
Game Loop                       │
    │  PATCH /games/:id/move    │
    │  {row, col, value}        │
    ├──────────────────────────▶│ Validate (row/col/box)
    │                           │ Check vs solution
    │   {isCorrect, game}       │ Optimistic lock check
    │◀──────────────────────────┤ Update version++
    │                           │
    │  [If mistake >= 3]        │
    │                           │ Status → FAILED
    │  [If all cells correct]   │
    │                           │ Status → COMPLETED
    │                           │ Create GameHistory
    │                           │ Update user stats
    │                           │
    ▼                           │
 Result Modal                   │
```

## Competitive Match Flow

```
Host                  Server                 Guest
  │                     │                      │
  │ match:create        │                      │
  ├────────────────────▶│                      │
  │                     │ Create match (WAITING)│
  │ match:created       │                      │
  │◀────────────────────┤                      │
  │ (roomCode: ABC123)  │                      │
  │                     │                      │
  │                     │      match:join       │
  │                     │◀─────────────────────┤
  │                     │ Status → JOINED       │
  │ match:playerJoined  │ match:joined          │
  │◀────────────────────┤─────────────────────▶│
  │                     │                      │
  │ match:ready         │     match:ready       │
  ├────────────────────▶│◀─────────────────────┤
  │                     │ Both ready → START    │
  │ match:start         │ match:start           │
  │◀────────────────────┤─────────────────────▶│
  │ (puzzle + timer)    │                      │
  │                     │                      │
  │ game:move           │      game:move        │
  ├────────────────────▶│◀─────────────────────┤
  │ match:opponentProgress                     │
  │◀────────────────────┤─────────────────────▶│
  │                     │                      │
  │                     │ First to complete wins│
  │ match:ended         │ match:ended           │
  │◀────────────────────┤─────────────────────▶│
  │ (result + ELO)      │ Update ELO ratings    │
  │                     │                      │

Disconnect: 30s grace → auto-loss
Timeout: 20 min → compare progress
Spectators: Read-only via spectate:join
```

## ELO Rating System

```
Expected = 1 / (1 + 10^((opponent - player) / 400))
RatingChange = K * (actual - expected)

K-factor: 32 (< 30 games), 16 (>= 30 games)
Minimum rating: 100
Default rating: 1000
Actual: Win=1.0, Draw=0.5, Loss=0.0
```

## Database Schema

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  users   │     │ puzzles  │     │  matches │
├──────────┤     ├──────────┤     ├──────────┤
│ id (PK)  │◄──┐│ id (PK)  │◄──┐│ id (PK)  │
│ email    │   ││ difficulty│   ││ roomCode │
│ username │   ││ puzzle    │   ││ hostId──▶users
│ password │   ││ solution  │   ││ guestId─▶users
│ rating   │   ││ rating    │   ││ puzzleId▶puzzles
│ stats... │   │└──────────┘   ││ status   │
└──────────┘   │               ││ result   │
     ▲         │               │└──────────┘
     │    ┌────┴───────┐  ┌───┴────────────┐
     │    │   games    │  │ game_history   │
     │    ├────────────┤  ├────────────────┤
     └────┤ userId (FK)│  │ userId (FK)───▶users
          │ puzzleId──▶puzzles │ timeElapsed│
          │ currentState│  │ difficulty    │
          │ moveHistory│  │ completedAt   │
          │ version    │  └────────────────┘
          │ gameMode   │
          │ tripodData │
          └────────────┘
```

## Real-time Architecture

**Transport:** Socket.io (WebSocket primary, polling fallback)

**Connection:** JWT validated on handshake, token refresh on auth:expiringSoon

**Room Strategy:**

- Game: `game:{userId}` (single-player sync)
- Match: `match:{roomCode}` (competitive)
- Spectator: `spectator:{matchId}` (viewers)

**Rate Limiting:** Per-event, per-socket connection

**Reconnection:** Exponential backoff (1s → 2s → 4s → 8s, max 5 attempts)

**Event Flow:**

```
Client emit → Gateway handler → Service logic → Room broadcast
                     │
                     ├── JWT validation
                     ├── Rate limit check
                     └── Error handling → client error event
```

## Security Measures

| Layer          | Mechanism                                 |
| -------------- | ----------------------------------------- |
| Passwords      | bcrypt (cost 10)                          |
| Auth tokens    | JWT (7d registered, 30d anonymous)        |
| API validation | class-validator on all DTOs               |
| SQL injection  | TypeORM parameterized queries             |
| Time cheating  | Server-calculated elapsed time            |
| Cell tampering | Initial cells protected from modification |
| Socket auth    | JWT validated on connection               |
| Rate limiting  | Per-event per-socket                      |
| CORS           | Configured for allowed origins            |

## Concurrency Handling

**Problem:** Multiple tabs/devices modifying same game simultaneously

**Solution:** Optimistic locking on Game entity

```
UPDATE games SET ... WHERE id = ? AND version = ?
-- If version mismatch → retry (max 3)
-- version increments on every save
```

## Scalability Notes

**Current:** Single-server SQLite (development)

**Production path:**

- Database: SQLite → PostgreSQL
- WebSocket: Add Redis adapter for multi-instance Socket.io
- Match state: Currently in-memory → needs shared state (Redis)
- Mutation timers: setInterval → centralized task queue
- Leaderboard: In-memory caching already in place
