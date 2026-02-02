# Project Roadmap

> **Last Updated**: February 2, 2026 | **Current Branch**: feat/tripod

## Phase Overview

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Backend & Core Game | COMPLETE | NestJS API, auth, game logic, puzzle generation |
| Phase 2: Frontend Foundation | COMPLETE | Next.js app, UI components, Socket.io integration |
| Phase 3: Polish & Features | IN PROGRESS | Competitive, tripod, mutations, leaderboard |
| Phase 4: Testing & Deployment | UPCOMING | Test coverage, CI/CD, production deploy |

---

## Phase 1: Backend & Core Game (COMPLETE)

Completed: January 20, 2026

- [x] NestJS project setup with TypeORM + SQLite
- [x] JWT authentication + anonymous sessions
- [x] User migration (anonymous → registered)
- [x] Sudoku puzzle generator (backtracking algorithm)
- [x] Auto-seeding 1200 puzzles (400/difficulty)
- [x] Game CRUD with move validation
- [x] Sudoku validator (row/col/box conflict detection)
- [x] Hint service (3-tier priority: conflicts → suggestion → reveal)
- [x] Undo/redo with move history
- [x] 3-mistake game over
- [x] Socket.io gateway with real-time sync
- [x] CORS configuration
- [x] Input validation (class-validator)
- [x] Swagger/OpenAPI documentation

## Phase 2: Frontend Foundation (COMPLETE)

Completed: January 2026

- [x] Next.js 16 + TypeScript + Tailwind CSS setup
- [x] Home page (difficulty + game mode selection)
- [x] Game page (9x9 grid, number pad, controls)
- [x] Zustand stores (game, auth, ui)
- [x] Socket.io client integration
- [x] API client with auto token refresh
- [x] Dark mode support
- [x] Mobile-first responsive design
- [x] Keyboard navigation (arrows, 1-9, shortcuts)
- [x] Notes mode (candidate marking)
- [x] Basic animations (shake, pulse, fade)
- [x] i18n setup (English + Vietnamese)

## Phase 3: Polish & Features (IN PROGRESS)

### Competitive Mode (COMPLETE)
- [x] Match module (create, join, ready, play, finish)
- [x] ELO rating system (K-factor: 32 new, 16 established)
- [x] Matchmaking service (queue + expanding search radius)
- [x] Competitive lobby page
- [x] Real-time opponent progress
- [x] Match result modal (ELO delta display)
- [x] Spectator mode (watch live matches)
- [x] Reconnection handling (30s grace period)
- [x] Rematch system
- [x] Match state persistence (localStorage)

### Leaderboard (COMPLETE)
- [x] Solo leaderboard (best times by difficulty)
- [x] Competitive leaderboard (ELO rankings)
- [x] Multi-period filtering (daily, weekly, monthly, all-time)
- [x] User rank display
- [x] Dashboard page with stats

### Mutating Mode (COMPLETE)
- [x] MutationService (30s interval cell clearing)
- [x] Mutation timer UI with countdown
- [x] Mutation animations (gradient, glow, shake)
- [x] Version conflict retry logic

### Tripod Puzzle (IN PROGRESS - feat/tripod branch)
- [x] 7x7 grid with tripod dot system
- [x] Border drawing mechanics
- [x] Region detection (BFS algorithm)
- [x] Border validation (prevent 4-way intersections)
- [x] Sub-modes (Full, Borders Only, Sudoku Only)
- [x] Input mode toggle (Number/Border)
- [x] Undo/redo for border operations
- [x] Completion celebration
- [x] Statistics tracking
- [x] 3 sample puzzles (Easy, Medium, Hard)
- [x] Shared NumberPad and Timer components
- [ ] Backend tripod puzzle generation
- [ ] Online tripod puzzle library
- [ ] Tripod leaderboard

### Auth Pages (COMPLETE)
- [x] Login page
- [x] Signup page
- [x] Auth store with cross-tab sync

### UI Polish
- [x] Theme switcher (light/dark/system)
- [x] Theme color selector
- [x] Sound system (Web Audio synthesis)
- [x] Toast notifications
- [x] Enhanced modals (success/failure)
- [x] Tutorial overlay (8 steps)
- [x] Debug panel (dev mode)
- [ ] Sound effects integration in gameplay
- [ ] Additional color themes

## Phase 4: Testing & Deployment (UPCOMING)

### Testing
- [ ] Backend unit test coverage > 80%
- [ ] Frontend unit test expansion (currently 42 tripod tests)
- [ ] E2E test expansion (currently 3 specs)
- [ ] Performance testing (Lighthouse)
- [ ] Load testing (concurrent WebSocket connections)

### CI/CD
- [ ] GitHub Actions pipeline
- [ ] Automated testing on PR
- [ ] Build verification
- [ ] Linting enforcement

### Deployment
- [ ] PostgreSQL migration (production)
- [ ] Redis adapter for Socket.io (multi-instance)
- [ ] Backend deploy (Railway/Fly.io)
- [ ] Frontend deploy (Vercel)
- [ ] Environment variable management
- [ ] Monitoring and alerting

---

## Known Technical Debt

| Area | Issue | Priority |
|------|-------|----------|
| JWT Storage | localStorage (XSS vulnerable) → HTTPOnly cookies | Medium |
| Game entity | Large files (game/page.tsx: 1306 lines) | Low |
| Socket scaling | In-memory match state → needs Redis for multi-instance | High (for prod) |
| Mutation timer | setInterval → needs centralized scheduler | Medium |
| Data retention | No game history cleanup policy | Low |
| Tripod backend | Puzzle generation not implemented | Medium |
| Rate limits | Defined but values not tuned | Low |
| Undo inconsistency | Tripod undo works for borders only, not numbers | Low |

## Future Features (from BRD)

### Short-term
- Daily challenges
- Achievement system
- Tutorial improvements
- Social media sharing

### Medium-term
- Tournament mode
- Friends system
- Custom puzzle creation
- PWA (offline support)

### Long-term
- AI difficulty adjustment
- Additional Sudoku variants
- Clan/team system
- Premium subscription
- Native mobile apps

---

See [Business Requirements Document](./business-requirements-document.md) for detailed feature specifications.
