# Code Standards

> **Last Updated**: February 2, 2026

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files (code) | kebab-case | `sudoku-validator.service.ts` |
| Files (component) | PascalCase | `SudokuGrid.tsx` |
| Classes | PascalCase | `GameService` |
| Interfaces | PascalCase | `JwtPayload` |
| Functions | camelCase | `makeMove()` |
| Constants | UPPER_SNAKE | `MAX_MISTAKES` |
| Types | PascalCase | `TripodState` |
| Zustand stores | camelCase | `useGameStore` |
| Hooks | camelCase (use-prefix) | `useTripodGame` |
| DTOs | PascalCase + Dto suffix | `CreateGameDto` |
| Entities | PascalCase + Entity suffix | `GameEntity` |
| CSS classes | Tailwind utilities | `bg-indigo-600 dark:bg-slate-800` |

## File Organization

### File Size
- **Target:** Under 200 lines per file
- **Split strategy:** Extract utilities, sub-components, or service methods
- **Exceptions:** Page components may exceed when containing inline logic

### Module Structure (Backend)
```
module-name/
├── module-name.module.ts      # NestJS module definition
├── module-name.controller.ts  # HTTP endpoints
├── services/
│   ├── main.service.ts        # Primary business logic
│   └── helper.service.ts      # Supporting services
├── dto/
│   ├── create-thing.dto.ts    # Input validation
│   └── thing-response.dto.ts  # Response shaping
└── index.ts                   # Public exports
```

### Component Structure (Frontend)
```
component-name/
├── ComponentName.tsx          # Main component
├── SubComponent.tsx           # Child components
└── index.ts                   # Barrel exports
```

## TypeScript Patterns

### Backend (NestJS)
- **Strict mode:** `strictNullChecks` enabled
- **Decorators:** NestJS decorators for DI, validation, auth
- **DTOs:** class-validator decorators for input validation
- **Entities:** TypeORM decorators for schema definition
- **Generics:** TypedSocket, TypedServer for Socket.io type safety

```typescript
// DTO validation
export class MakeMoveDto {
  @IsInt() @Min(0) @Max(8) row: number;
  @IsInt() @Min(0) @Max(8) col: number;
  @IsInt() @Min(1) @Max(9) value: number;
  @IsOptional() @IsBoolean() isNote?: boolean;
}

// Entity with optimistic locking
@Entity('games')
export class Game {
  @VersionColumn() version: number;
}
```

### Frontend (React/Next.js)
- **Strict mode:** enabled
- **Path aliases:** `@/*` → project root
- **Module resolution:** ESNext + bundler
- **No-emit:** TypeScript for type checking only

```typescript
// Zustand store pattern
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // State
      currentState: [],
      // Actions
      makeMove: (row, col, value) => set((s) => ({ ... })),
    }),
    { name: 'sudoku-game-storage' }
  )
);
```

## Component Patterns

### Controlled vs Uncontrolled
- **Timer (Classic):** Uncontrolled - auto-increments internally
- **Timer (Tripod):** Controlled - receives `elapsedTime` prop
- **NumberPad:** Controlled - receives `disabled`, `disabledNumbers`
- **SudokuGrid:** Reads from Zustand store (uncontrolled)

### Portal Rendering
```typescript
// Tutorial uses portal to avoid z-index/re-render issues
return createPortal(tutorialContent, document.body);
```

### Lazy Initialization
```typescript
// Prevent re-generating puzzle on every render
const [currentPuzzle] = useState(() => getRandomTripodPuzzle());
```

### Ref-Based State (Non-Rendering)
```typescript
// Timer: Track last synced time without re-renders
const lastSyncedTimeRef = useRef(displayTime);
```

## State Management

### Zustand Conventions
- **Persist plugin** for game, auth, ui stores
- **Cross-tab sync** via BroadcastChannel (auth store only)
- **Hydration guard:** `_hasHydrated` flag before rendering persisted state
- **Safe localStorage:** Catches quota errors, clears non-critical data

### Store Selection
```typescript
// Use selectors for stable references
const difficulty = useGameStore((s) => s.difficulty);
const { makeMove } = useGameStore.getState();
```

## API Patterns

### fetchApi Wrapper
- Auto-calls `authService.refreshTokenIfNeeded()` before every request
- 5-minute refresh threshold
- Deduplicates concurrent refresh calls
- Maps HTTP errors to user-friendly messages
- 401 → logout + redirect

### Error Handling
```typescript
// Backend: NestJS exceptions
throw new BadRequestException('Invalid move');
throw new NotFoundException('Game not found');
throw new ConflictException('Version mismatch');

// Frontend: Try-catch with user messages
try {
  await api.games.move(gameId, { row, col, value });
} catch (error) {
  toast.error(error.message);
}
```

## Socket.io Patterns

### Event Naming
```
domain:action     # game:move, match:create, mutation:occurred
domain:state      # game:state, match:start
domain:error      # game:error, match:error
```

### Connection Management
- WebSocket primary, polling fallback
- Exponential backoff: 1s → 2s → 4s → 8s (max 5 attempts)
- JWT validated on handshake
- Token refresh on `auth:expiringSoon` event

### Socket Debouncing
```typescript
// Sync timer every 5s, not on every tick
setInterval(() => {
  socket.emit('game:updateTime', { gameId, timeElapsed });
}, 5000);
```

## Security Standards

### Authentication
- Passwords: bcrypt with cost factor 10
- JWT: 7d registered, 30d anonymous
- Token storage: localStorage (XSS risk accepted for simplicity)
- Token refresh: Auto on 401 and before expiry

### Input Validation
- **Backend:** class-validator on all DTOs, global ValidationPipe
- **Frontend:** Bounds checking, given cell protection
- **Socket:** JWT validation on connection, rate limiting per event

### Data Integrity
- Server-calculated time (prevents client cheating)
- Initial puzzle cells protected from modification
- Optimistic locking prevents concurrent corruption

## Testing Standards

### Backend (Jest)
```typescript
// Service tests with NestJS testing module
const module = await Test.createTestingModule({
  providers: [SudokuValidatorService],
}).compile();
```

### Frontend Unit (Vitest)
- Test files: `lib/__tests__/*.test.ts`
- Focus: Utility functions, validation logic
- Current: 42 tests for tripod validation

### Frontend E2E (Playwright)
- Test files: `e2e/*.spec.ts`
- Specs: game-flow, auth-flow, realtime-sync
- Selectors: `data-testid` attributes

## Git Conventions

### Commit Messages
```
type(scope): description

feat(tripod): add border validation
fix(game): resolve timer sync race condition
refactor(auth): extract token refresh logic
test(tripod): add region detection tests
docs: update system architecture
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring
- `test` - Test additions/changes
- `docs` - Documentation
- `chore` - Build, config, dependencies

## Styling Standards

### Approach
- **Primary:** Tailwind CSS 4 utility classes
- **Secondary:** Inline styles for dynamic values
- **Dark mode:** `dark:` prefix classes
- **Responsive:** Mobile-first with `sm:`, `lg:`, `xl:` breakpoints

### Color Palette
| Purpose | Light | Dark |
|---------|-------|------|
| Primary | #4f46e5 (Indigo) | #4f46e5 |
| Background | #ffffff | #1e293b (Slate-800) |
| Text | #1e1b4b | #e0e7ff |
| Error | #ef4444 | #ef4444 |
| Success | #10b981 | #10b981 |

### Mobile-First
- Touch targets: 44px minimum
- Grid cells: Dynamic sizing via `useMobileDetect`
- NumberPad: Full-width on mobile, fixed-width on desktop
- Safe area padding for notched devices
