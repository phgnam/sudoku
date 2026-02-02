# Project Overview & PDR

> **Product**: Sudoku Game - Premium Real-time Multiplayer
> **Status**: Phase 3 (Polish & Features) In Progress
> **Last Updated**: February 2, 2026

## Product Identity

A premium, mobile-first Sudoku game platform with real-time multiplayer capabilities. Supports 3 game modes (Classic, Mutating, Tripod), competitive 1v1 with ELO rating, spectator mode, and cross-device synchronization.

## Target Users

| Persona | Needs | Features |
|---------|-------|----------|
| Casual Player | Relaxing puzzle experience | Easy mode, hints, notes, undo |
| Competitive Player | Ranking and PvP | ELO matchmaking, leaderboards |
| Speedrunner | Fast completion times | Timer, best time tracking |
| Learner | Step-by-step guidance | Tutorial, hint explanations |

## Business Goals

| Goal | Strategy |
|------|----------|
| User Acquisition | Free play (anonymous), 3 game modes |
| User Retention | ELO ranking, leaderboards, progressive unlock |
| Monetization | Premium features, ads-free (future) |
| Platform Coverage | Responsive web (mobile/tablet/desktop) |

## Feature Matrix

### Game Modes

| Feature | Classic | Mutating | Tripod |
|---------|---------|----------|--------|
| Grid Size | 9x9 | 9x9 | 7x7 |
| Difficulties | Easy/Normal/Hard | Same | Easy/Medium/Hard |
| Hints | 3/game (3-tier) | 3/game | N/A |
| Notes | Yes | Yes | N/A |
| Undo/Redo | Yes | Yes | Borders only |
| Mistakes | 3 max | 3 max | N/A |
| Timer | Auto-sync | Auto-sync | Local |
| Special | - | 30s cell mutations | Border drawing |
| Status | Complete | Complete | In Progress |

### Platform Features

| Feature | Status | Notes |
|---------|--------|-------|
| Anonymous play | Done | 30-day JWT, auto-migration |
| Account system | Done | Register, login, migrate |
| Real-time sync | Done | Socket.io, cross-tab |
| Dark mode | Done | System/light/dark |
| i18n (en/vi) | Done | next-intl + nestjs-i18n |
| Competitive 1v1 | Done | ELO, matchmaking, rematch |
| Spectator mode | Done | Watch live matches |
| Leaderboard | Done | Solo times + competitive ELO |
| Dashboard | Done | Personal stats, recent games |
| Sound effects | Partial | Web Audio synthesized, not wired to all events |
| Tutorial | Done | 8-step interactive overlay |
| Keyboard nav | Done | Arrows, 1-9, N, Z, Escape |
| Mobile touch | Done | 44px targets, responsive grid |

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11 (TypeScript) |
| Frontend | Next.js 16 (App Router, React 19) |
| Database | SQLite + TypeORM (dev), PostgreSQL (prod planned) |
| Real-time | Socket.io |
| State | Zustand 5 (persisted) |
| Styling | Tailwind CSS 4 |
| Auth | JWT + bcrypt + Passport |
| i18n | next-intl / nestjs-i18n |
| Testing | Jest, Vitest (42 tests), Playwright (3 E2E specs) |

## Architecture Summary

**Monorepo:** `backend/` (NestJS API, port 3001) + `frontend/` (Next.js, port 3000)

**Backend:** 8 NestJS modules (Auth, Game, Puzzle, Match, Leaderboard, Gateway, Database, i18n)

**Frontend:** 10 pages, 50+ components, 5 Zustand stores, 13 custom hooks

**Database:** 5 entities (User, Puzzle, Game, GameHistory, Match) with optimistic locking

**Real-time:** 48+ Socket.io events across game, match, spectator, mutation domains

See [System Architecture](./system-architecture.md) for diagrams and detailed flows.

## Non-Functional Requirements

| Metric | Target |
|--------|--------|
| Page load (FCP) | < 2 seconds |
| API response (P95) | < 200ms |
| WebSocket latency | < 100ms |
| Concurrent users | 1000+ |
| Database query | < 50ms |
| Uptime | 99.9% |
| Browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| Mobile support | iOS 14+, Android 8+ |

## Security

| Mechanism | Implementation |
|-----------|---------------|
| Password hashing | bcrypt (cost 10) |
| Auth tokens | JWT with expiration |
| Input validation | class-validator (backend), bounds checking (frontend) |
| SQL injection | TypeORM parameterized queries |
| Time fairness | Server-calculated elapsed time |
| Cell protection | Initial puzzle cells immutable |
| Socket auth | JWT validated on connection |
| Rate limiting | Per-event, per-socket |
| CORS | Configured for allowed origins |

## Known Constraints

1. **SQLite limitation:** Single-writer, not suitable for horizontal scaling
2. **In-memory match state:** Lost on server restart
3. **localStorage tokens:** XSS vulnerable (HTTPOnly cookies planned)
4. **No offline mode:** Requires internet connection
5. **Tripod backend:** Puzzle generation not yet implemented server-side

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Game modes | 3 | 3+ |
| Pre-generated puzzles | 1200 | 1200+ |
| Supported languages | 2 | 2+ |
| Test coverage (frontend) | ~42 unit tests | 80%+ |
| E2E test specs | 3 | 10+ |
| Pages | 10 | 10+ |
| Components | 50+ | 50+ |

## Related Documents

- [Business Requirements](./business-requirements-document.md) - Detailed functional specs, use cases, workflows
- [API Specification](./api-specification.md) - REST + Socket.io endpoint documentation
- [User Stories](./user-stories.md) - User stories with acceptance criteria
- [System Architecture](./system-architecture.md) - Technical architecture and diagrams
- [Code Standards](./code-standards.md) - Development conventions and patterns
- [Project Roadmap](./project-roadmap.md) - Phase tracking and milestones
- [Codebase Summary](./codebase-summary.md) - Directory structure and module overview
