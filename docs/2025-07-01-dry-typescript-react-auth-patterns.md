# DRY Principles for TypeScript/React Authentication Patterns

**Date:** 2025-07-01  
**Focus:** Code reuse patterns for auth logic in TypeScript/React applications

---

## Executive Summary

Apply DRY to auth code via: (1) shared utility modules, (2) custom hooks with Context, (3) singleton token services, (4) unified auth headers for WebSocket+REST.

---

## 1. Shared Utility Functions for Auth Logic

**Pattern:** Centralize token parsing, validation, expiry checks in a single module.

```typescript
// src/utils/auth.ts
export const isTokenExpired = (token: string): boolean => {
  const { exp } = JSON.parse(atob(token.split('.')[1]));
  return Date.now() >= exp * 1000;
};

export const getAuthHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export type AuthTokens = { accessToken: string; refreshToken: string };
```

**Why:** Single source of truth; changes propagate everywhere. Use TypeScript `type` aliases to avoid repeating token shapes [1].

---

## 2. Custom Hooks for Reusable Auth Logic

**Pattern:** Kent C. Dodds' Context + Hook pattern [2]

```typescript
// src/hooks/useAuth.ts
const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

**Key Points:**
- `undefined` default + runtime check = type-safe without casting
- `useMemo` prevents unnecessary re-renders
- Single hook replaces repeated context consumption across components

---

## 3. Token Refresh Service Patterns

### 3a. Singleton Pattern (Recommended for token refresh)

```typescript
// src/services/TokenService.ts
class TokenService {
  private static instance: TokenService;
  private refreshPromise: Promise<string> | null = null;

  private constructor() {}

  static getInstance(): TokenService {
    if (!TokenService.instance) TokenService.instance = new TokenService();
    return TokenService.instance;
  }

  async getValidToken(): Promise<string> {
    const token = localStorage.getItem('accessToken');
    if (token && !isTokenExpired(token)) return token;
    
    // Dedupe concurrent refresh calls
    if (!this.refreshPromise) {
      this.refreshPromise = this.refresh().finally(() => { this.refreshPromise = null; });
    }
    return this.refreshPromise;
  }

  private async refresh(): Promise<string> {
    const res = await fetch('/api/refresh', { /* ... */ });
    const { accessToken } = await res.json();
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  }
}

export const tokenService = TokenService.getInstance();
```

**Why Singleton:** Prevents race conditions when multiple components/requests trigger refresh simultaneously [3].

### 3b. Axios Interceptor Integration

```typescript
axios.interceptors.request.use(async (config) => {
  const token = await tokenService.getValidToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## 4. WebSocket + REST API Shared Auth Utilities

**Pattern:** Unified auth header factory consumed by both transports.

```typescript
// src/utils/auth.ts (extend existing)
export const createAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await tokenService.getValidToken();
  return { Authorization: `Bearer ${token}` };
};

// REST: const response = await fetch(url, { headers: await createAuthHeaders() });
// WebSocket via Socket.IO: const socket = io({ auth: { token: await tokenService.getValidToken() } });
```

---

## 5. TypeScript Patterns for Code Reuse

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Type Aliases** | Reuse complex types | `type AuthState = { user: User \| null; loading: boolean }` |
| **Generics** | Flexible util funcs | `function apiCall<T>(url: string): Promise<T>` |
| **Mapped Types** | Create variants | `type ReadonlyUser = Readonly<User>` |
| **Utility Types** | Transform types | `Partial<T>`, `Pick<T, K>`, `Omit<T, K>` |
| **Interface Extension** | Build on base types | `interface AdminUser extends User { permissions: string[] }` |

---

## Sources

1. SystemsArchitect.io - DRY Principles in TypeScript: https://systemsarchitect.io/docs/guides/typescript-guide/intermediate-best-practices/dry-principles-in-typescript
2. Kent C. Dodds - How to use React Context effectively: https://kentcdodds.com/blog/how-to-use-react-context-effectively
3. Stack Overflow - Axios interceptor refresh token for multiple requests: https://stackoverflow.com/questions/57890667/
4. TanStack/React Query Discussions - Auth patterns: https://github.com/TanStack/query/discussions/3253
5. Medium (Ed Halliwell) - WebSocket + TypeScript auth: https://medium.com/@edhalliwell/chat-app-driven-by-websockets-using-socket-io-and-typescript

---

## Key Takeaways

- **Single token service** = no duplicate refresh logic
- **useAuth hook** = one import vs repeated context boilerplate  
- **Type aliases + generics** = define once, use everywhere
- **Axios interceptors** = attach auth at one point, not per request
- **Shared auth header factory** = unified WebSocket + REST auth

