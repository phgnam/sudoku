# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monorepo for a multiplayer Sudoku platform with three game modes (Classic 9x9, Mutating, Tripod 7x7), real-time competitive play via Socket.io, and ELO ranking. Backend is NestJS 11 on port 3001, frontend is Next.js 16 (App Router) on port 3000. SQLite database auto-creates and seeds 1,200 puzzles on first run.

## Commands

### Backend (npm, in `backend/`)
```bash
npm run start:dev          # Dev server with watch mode
npm run build              # Compile to dist/
npm run lint               # ESLint with auto-fix
npm run test               # Jest unit tests
npm run test:watch         # Jest watch mode
npm run test:cov           # Coverage report
npm run test:e2e           # E2E tests
```

### Frontend (pnpm, in `frontend/`)
```bash
pnpm dev                   # Next.js dev server
pnpm build                 # Production build
pnpm lint                  # ESLint check
pnpm test                  # Vitest unit tests
pnpm test:watch            # Vitest watch mode
pnpm test:e2e              # Playwright (all browsers)
pnpm test:e2e:chrome       # Playwright (Chrome only)
pnpm test:e2e:headed       # Playwright with visible browser
```

### Running a Single Test
```bash
# Backend (Jest)
cd backend && npx jest --testPathPattern='pattern'

# Frontend (Vitest)
cd frontend && pnpm vitest run path/to/test.test.ts

# Frontend E2E (Playwright)
cd frontend && npx playwright test path/to/spec.ts
```

## Architecture

### Monorepo Layout
- `backend/` — NestJS API (npm). 7 modules: Auth, Game, Puzzle, Match, Leaderboard, Gateway (Socket.io), Database (TypeORM + SQLite)
- `frontend/` — Next.js App Router (pnpm). 10 routes, 50+ components, 5 Zustand stores, 13 custom hooks
- `docs/` — Shared documentation (architecture, code standards, roadmap, API spec)

### Backend Module Architecture
Each NestJS module follows: `module.ts` → `controller.ts` → `services/` → `dto/`. Key modules:
- **AuthModule**: JWT + anonymous auth, token refresh, anonymous-to-registered migration
- **GameModule**: Move validation, hints, undo/redo, mutation timer, Tripod logic
- **GatewayModule**: Socket.io gateway handling 48+ events with JWT handshake validation
- **PuzzleModule**: Backtracking puzzle generator, auto-seeding on startup

### Frontend State & Data Flow
```
User Action → Component → Zustand Store → fetchApi / Socket.io → Backend
Backend → DB Update → Socket broadcast → Zustand → Re-render
```
- **State**: 5 Zustand stores (game, auth, match, spectator, ui) with `persist` plugin and localStorage
- **API**: `fetchApi` wrapper auto-refreshes JWT before requests (5-min threshold)
- **Socket**: Exponential backoff reconnection (1s→2s→4s→8s, max 5 attempts)
- **Hydration**: `_hasHydrated` flag guards persisted state before rendering

### Database
SQLite with TypeORM. 5 entities: User, Puzzle, Game, GameHistory, Match. Optimistic locking via `@VersionColumn()` on Game entity. Auto-syncs schema in development.

### Tripod Game Mode (7x7)
Distinct from classic Sudoku — players draw borders on cell edges to create regions. Each "tripod dot" must touch exactly 3 borders. Has sub-modes: Full Tripod, Borders Only, Sudoku Only. Validation logic in `frontend/hooks/useTripodValidation.ts` and `frontend/lib/tripod-utils.ts`.

## Key Conventions

### Naming
- Code files: kebab-case (`sudoku-validator.service.ts`)
- Components: PascalCase (`SudokuGrid.tsx`)
- Zustand stores: `use[Name]Store`
- Hooks: `use[Name]`
- DTOs: `[Name]Dto`
- Commit messages: `type(scope): description` (conventional commits)

### File Size
Target under 200 lines per code file. Extract utilities, sub-components, and service methods when exceeded.

### Frontend Path Alias
`@/*` maps to the frontend project root in imports.

### Socket Event Naming
`domain:action` pattern (e.g., `game:move`, `match:create`, `mutation:occurred`).

### Environment Variables
Backend: `DATABASE_PATH`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `PORT`. Frontend: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`. Both have `.env.example` files.

### Styling
Tailwind CSS 4 with custom CSS variables for accent colors. Dark mode via `class` strategy. Custom fonts: Fredoka (headings), Nunito (body). Mobile-first with 44px min touch targets.

### Internationalization
next-intl (frontend) + nestjs-i18n (backend). English + Vietnamese.

## Documentation

Detailed docs live in `docs/`:
- `system-architecture.md` — Data flows, security, database schema
- `code-standards.md` — Full naming, patterns, and conventions reference
- `api-specification.md` — All REST + Socket.io endpoints
- `project-roadmap.md` — Phase tracking and milestones
- `codebase-summary.md` — Module overview and entity listing

Swagger API docs available at `http://localhost:3001/api/docs` when backend is running.
