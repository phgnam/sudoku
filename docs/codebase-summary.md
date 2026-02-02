# Codebase Summary

> **Last Updated**: February 2, 2026 | **Branch**: feat/tripod

## Directory Structure

```
sudoku/
├── backend/                      # NestJS API (Port 3001)
│   ├── src/
│   │   ├── auth/                # JWT + anonymous auth
│   │   │   ├── auth.controller.ts    # 6 endpoints
│   │   │   ├── services/auth.service.ts
│   │   │   ├── strategies/jwt.strategy.ts
│   │   │   ├── guards/jwt-auth.guard.ts
│   │   │   ├── decorators/current-user.decorator.ts
│   │   │   └── dto/auth.dto.ts
│   │   ├── game/                # Single-player logic
│   │   │   ├── game.controller.ts    # 8 endpoints
│   │   │   ├── services/
│   │   │   │   ├── game.service.ts           # CRUD + moves + completion
│   │   │   │   ├── sudoku-validator.service.ts # Row/col/box validation
│   │   │   │   ├── hint.service.ts           # 3-tier priority hints
│   │   │   │   └── mutation.service.ts       # Timed cell clearing
│   │   │   └── dto/
│   │   │       ├── game.dto.ts
│   │   │       └── tripod.dto.ts
│   │   ├── puzzle/              # Puzzle generation + seeding
│   │   │   └── services/
│   │   │       ├── sudoku-generator.service.ts  # Backtracking algorithm
│   │   │       └── tripod-puzzle.service.ts     # Border/region detection
│   │   ├── match/               # Competitive 1v1
│   │   │   └── services/
│   │   │       ├── match.service.ts          # DB CRUD
│   │   │       ├── match-manager.service.ts  # In-memory lifecycle
│   │   │       ├── elo.service.ts            # ELO calculation
│   │   │       └── matchmaking.service.ts    # Queue + pairing
│   │   ├── leaderboard/         # Rankings (4 endpoints)
│   │   ├── gateway/             # Socket.io (48+ events)
│   │   │   ├── game.gateway.ts
│   │   │   └── types/           # TypedSocket, rate-limit types
│   │   ├── database/            # TypeORM entities
│   │   │   └── entities/        # User, Puzzle, Game, GameHistory, Match
│   │   └── i18n/                # nestjs-i18n (en, vi)
│   ├── sudoku.db                # SQLite (auto-created, auto-seeded)
│   └── package.json
│
├── frontend/                     # Next.js 16 (Port 3000)
│   ├── app/                     # 10 pages (App Router)
│   │   ├── page.tsx             # Home: difficulty + mode selection
│   │   ├── game/page.tsx        # Classic/Mutating Sudoku
│   │   ├── tripod/page.tsx      # Tripod puzzle mode
│   │   ├── dashboard/page.tsx   # Stats + leaderboard
│   │   ├── auth/{login,signup}/page.tsx
│   │   ├── competitive/
│   │   │   ├── page.tsx         # Lobby
│   │   │   ├── play/page.tsx    # Active match
│   │   │   └── spectate/[matchId]/page.tsx
│   │   └── layout.tsx           # Root: i18n, theme, fonts
│   ├── components/              # 50+ components
│   │   ├── game/                # SudokuGrid, GameControls, MutationTimer
│   │   │   └── tripod/          # 10 sub-components (Grid, Cell, Border, Dot...)
│   │   ├── shared/              # NumberPad, Timer (reusable)
│   │   ├── multiplayer/         # 8 components (Lobby, Match, Spectator)
│   │   ├── leaderboard/         # 5 components (Table, Filters, Badge)
│   │   └── ui/                  # 10 components (Theme, Modal, Toast)
│   ├── hooks/                   # 13 custom hooks
│   │   ├── useGameSocket.ts     # Single-player socket events
│   │   ├── useMutationSocket.ts # Mutation mode events
│   │   ├── useMatchSocket.ts    # Competitive events (30+ events)
│   │   ├── useSpectatorSocket.ts
│   │   ├── useTripodGame.ts     # Tripod state + actions
│   │   ├── useTripodInput.ts    # Keyboard bindings
│   │   ├── useTripodValidation.ts  # Region + sudoku validation
│   │   ├── useBorderValidation.ts  # 4-way intersection prevention
│   │   ├── useMobileDetect.ts   # Responsive breakpoints
│   │   └── ...
│   ├── store/                   # 5 Zustand stores
│   │   ├── game.ts             # 56 props, 39 actions (persisted)
│   │   ├── auth.ts             # JWT + cross-tab BroadcastChannel
│   │   ├── match.ts            # 25 props, 30 actions
│   │   ├── spectator.ts
│   │   └── ui.ts               # Theme, tutorial prefs
│   ├── lib/                     # Utilities
│   │   ├── api.ts              # fetchApi with auto token refresh
│   │   ├── socket.ts           # Socket.io client + reconnection
│   │   ├── auth-service.ts     # Token refresh, logout handler
│   │   ├── sudoku-validator.ts # Client-side conflict detection
│   │   ├── tripod-utils.ts     # 20+ helper functions
│   │   ├── tripod-constants.ts # Grid limits, debounce values
│   │   ├── constants.ts        # Game config, socket events, themes
│   │   ├── sounds.ts           # Web Audio synthesis (5 effects)
│   │   ├── match-storage.ts    # localStorage for reconnection
│   │   └── __tests__/          # 42 Vitest tests
│   ├── types/                   # tripod.ts, leaderboard.ts
│   ├── data/                    # tripod-puzzles.ts (3 sample puzzles)
│   ├── i18n/                    # next-intl config
│   ├── messages/                # en.json, vi.json (100+ keys)
│   └── e2e/                     # 3 Playwright specs
│
└── docs/                        # Documentation
```

## Backend Modules

| Module | Purpose | Key Services |
|--------|---------|-------------|
| Auth | JWT + anonymous sessions | AuthService (register, login, migrate, refresh) |
| Game | Single-player logic | GameService, HintService, MutationService, SudokuValidatorService |
| Puzzle | Generation + seeding | SudokuGeneratorService (backtracking), TripodPuzzleService |
| Match | Competitive 1v1 | MatchManagerService, EloService, MatchmakingService |
| Leaderboard | Rankings | LeaderboardService (solo times, ELO) |
| Gateway | WebSocket hub | GameGateway (48+ events, rate limiting, JWT validation) |
| Database | TypeORM + SQLite | 5 entities with optimistic locking |
| i18n | Multi-language | I18nHelperService (en, vi) |

## Database Entities

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| User | id (UUID), email, username, rating (ELO:1000), stats | Nullable email/password for anonymous |
| Puzzle | difficulty, puzzle/solution (9x9 JSON), rating | 1200 pre-seeded (400/difficulty) |
| Game | currentState, moveHistory, version, gameMode, tripodData | Optimistic locking via version column |
| GameHistory | timeElapsed (server-calculated), difficulty, stats | Leaderboard source data |
| Match | roomCode (6-char), host/guestId, status, state, result | ELO updated on completion |

## Frontend Stores

| Store | Key State | Persistence |
|-------|----------|-------------|
| game | currentState, solution, moveHistory, notes, tripod state | localStorage |
| auth | user, token, sessionId | localStorage + BroadcastChannel |
| match | matchId, status, opponent, progress, ELO delta | None |
| spectator | hostState, guestState, result | None |
| ui | theme, colorMode, soundEnabled, selectedDifficulty | localStorage |

## Game Modes

**Classic Sudoku (9x9):** 3 difficulties, hints (conflicts → suggestion → reveal), notes, undo/redo, 3-mistake limit, progressive unlock

**Mutating Mode (9x9):** Classic rules + cells randomly clear every 30s via MutationService

**Tripod Puzzle (7x7):** Draw borders between regions, tripod dots at vertices must touch exactly 3 borders. Sub-modes: Full, Borders Only, Sudoku Only

## API Endpoints

| Module | Method | Route | Auth |
|--------|--------|-------|------|
| Auth | POST | /auth/anonymous | No |
| Auth | POST | /auth/register, /auth/login | No |
| Auth | POST | /auth/migrate, /auth/refresh | Yes |
| Auth | GET | /auth/me | Yes |
| Game | POST | /games | Yes |
| Game | GET | /games/:id, /games/active | Yes |
| Game | PATCH | /games/:id/move, /games/:id/time | Yes |
| Game | POST | /games/:id/undo, /games/:id/hint | Yes |
| Leaderboard | GET | /leaderboard, /leaderboard/me | Optional |
| Leaderboard | GET | /leaderboard/competitive, /leaderboard/competitive/me | Optional |

See [API Specification](./api-specification.md) for full request/response details.

## Socket.io Events (48+)

**Game (8):** game:join, game:move, game:undo, game:hint, game:sync, game:updateTime, game:state, game:timeUpdated

**Match (27):** match:create/join/ready/start/progress/complete, matchmaking:joined/found/cancelled, rematch events

**Spectator (3):** spectateState, spectatorUpdate, spectatorCount

**Mutation (4):** mutation:warning, mutation:occurred, mutation:started/stopped

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | NestJS | 11 |
| Frontend | Next.js (App Router) | 16 |
| Language | TypeScript | 5.x |
| Database | SQLite + TypeORM | - |
| Real-time | Socket.io | 4.x |
| State | Zustand | 5.x |
| Styling | Tailwind CSS | 4 |
| Auth | JWT + bcrypt + Passport | - |
| i18n | next-intl / nestjs-i18n | - |
| Testing | Jest, Vitest, Playwright | - |
| Package Manager | pnpm | - |
