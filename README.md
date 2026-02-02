# Sudoku Game - Premium Real-time Multiplayer

A premium, mobile-first Sudoku game with real-time multiplayer, ELO ranking, and multiple game modes. Built with NestJS and Next.js.

**Status:** Phase 3 (Polish & Features) In Progress

## Features

### 3 Game Modes
- **Classic Sudoku** - 9x9 grid, 3 difficulties, hints, notes, undo/redo
- **Mutating Mode** - Classic rules + cells randomly clear every 30 seconds
- **Tripod Puzzle** - 7x7 grid with border-drawing mechanics and tripod constraints

### Competitive Multiplayer
- 1v1 real-time matches with shared puzzles
- ELO rating system with matchmaking
- Spectator mode for live matches
- Rematch and reconnection support

### Platform
- Mobile-first responsive design
- Dark mode (light/dark/system)
- Internationalization (English + Vietnamese)
- Cross-tab synchronization
- Anonymous play with optional registration

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11 (TypeScript) |
| Frontend | Next.js 16 (App Router) |
| Database | SQLite + TypeORM |
| Real-time | Socket.io |
| State | Zustand 5 |
| Styling | Tailwind CSS 4 |
| Auth | JWT + bcrypt |
| Testing | Jest, Vitest, Playwright |

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm (frontend) / npm (backend)

### Backend (Port 3001)

```bash
cd backend
npm install
npm run start:dev
# API: http://localhost:3001
# Swagger: http://localhost:3001/api/docs
# Database auto-creates and seeds 1200 puzzles
```

### Frontend (Port 3000)

```bash
cd frontend
pnpm install
pnpm dev
# App: http://localhost:3000
```

## Project Structure

```
sudoku/
├── backend/              # NestJS API
│   └── src/
│       ├── auth/         # JWT + anonymous auth
│       ├── game/         # Game logic, hints, mutations, validator
│       ├── puzzle/       # Puzzle generation (backtracking)
│       ├── match/        # Competitive (ELO, matchmaking)
│       ├── leaderboard/  # Rankings
│       ├── gateway/      # Socket.io (48+ events)
│       ├── database/     # TypeORM entities (5)
│       └── i18n/         # Multi-language
├── frontend/             # Next.js App
│   ├── app/              # 10 pages
│   ├── components/       # 50+ components
│   ├── hooks/            # 13 custom hooks
│   ├── store/            # 5 Zustand stores
│   ├── lib/              # API, socket, utils
│   └── e2e/              # Playwright tests
└── docs/                 # Documentation
```

## API Endpoints

### Authentication
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /auth/anonymous | No |
| POST | /auth/register | No |
| POST | /auth/login | No |
| POST | /auth/migrate | Yes |
| GET | /auth/me | Yes |

### Game
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /games | Yes |
| GET | /games/:id | Yes |
| PATCH | /games/:id/move | Yes |
| POST | /games/:id/undo | Yes |
| POST | /games/:id/hint | Yes |

### Leaderboard
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | /leaderboard | Optional |
| GET | /leaderboard/competitive | Optional |

See [API Specification](docs/api-specification.md) for full details.

## Development

```bash
# Backend
cd backend
npm run start:dev     # Dev server
npm run test          # Jest tests
npm run build         # Production build

# Frontend
cd frontend
pnpm dev              # Dev server
pnpm test             # Vitest
pnpm test:e2e         # Playwright E2E
pnpm build            # Production build
```

## Documentation

| Document | Description |
|----------|-------------|
| [Project Overview](docs/project-overview-pdr.md) | Product requirements and feature matrix |
| [System Architecture](docs/system-architecture.md) | Architecture diagrams and data flows |
| [Codebase Summary](docs/codebase-summary.md) | Directory structure and module overview |
| [Code Standards](docs/code-standards.md) | Development conventions and patterns |
| [Project Roadmap](docs/project-roadmap.md) | Phase tracking and milestones |
| [API Specification](docs/api-specification.md) | REST and Socket.io endpoints |
| [Business Requirements](docs/business-requirements-document.md) | Detailed functional specifications |
| [User Stories](docs/user-stories.md) | User stories with acceptance criteria |

## License

MIT
