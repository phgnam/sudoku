import { jwtDecode } from "jwt-decode";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const REFRESH_TIMEOUT_MS = 10 * 1000; // 10 seconds
const IS_DEV = process.env.NODE_ENV === "development";

class AuthService {
  private static instance: AuthService;
  private refreshPromise: Promise<string> | null = null;
  private isLoggingOut = false;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Check if token is expiring soon and refresh if needed.
   * Uses deduplication to prevent multiple concurrent refresh calls.
   */
  async refreshTokenIfNeeded(): Promise<string | null> {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const decoded = jwtDecode<{ exp?: number }>(token);

      // Validate exp field exists and is a number
      if (typeof decoded.exp !== "number") {
        this.logError("refreshTokenIfNeeded", "INVALID_TOKEN_FORMAT");
        return token;
      }

      const expiresAt = decoded.exp * 1000;
      const timeUntilExpiry = expiresAt - Date.now();

      // Token still valid with enough buffer
      if (timeUntilExpiry > TOKEN_REFRESH_THRESHOLD_MS) {
        return token;
      }

      // Token already expired - let request fail with 401
      if (timeUntilExpiry <= 0) {
        return token;
      }

      // Deduplicate concurrent refresh calls
      if (!this.refreshPromise) {
        this.refreshPromise = this.doRefresh(token);
      }

      return this.refreshPromise;
    } catch (error) {
      this.logError("refreshTokenIfNeeded", error);
      return token;
    }
  }

  private async doRefresh(currentToken: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: this.createAuthHeaders(currentToken),
        signal: controller.signal,
      });

      if (!response.ok) {
        // On 401/403, log generic auth failure
        if (response.status === 401 || response.status === 403) {
          this.logError("doRefresh", "AUTH_FAILED");
          // Don't call handleUnauthorized here to avoid circular calls
          // Return current token and let the next request handle 401
        } else {
          this.logError("doRefresh", "REFRESH_FAILED");
        }
        return currentToken; // Graceful fallback
      }

      const data = await response.json();

      // Validate response structure without leaking expected format
      if (!data?.accessToken) {
        this.logError("doRefresh", "INVALID_RESPONSE");
        return currentToken; // Graceful fallback
      }

      try {
        localStorage.setItem("token", data.accessToken);
      } catch {
        this.logError("doRefresh", "STORAGE_ERROR");
        // Return new token anyway for this session (won't persist across reload)
      }
      return data.accessToken;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        this.logError("doRefresh", "TIMEOUT");
      } else {
        this.logError("doRefresh", "NETWORK_ERROR");
      }
      return currentToken; // Graceful fallback on network/timeout errors
    } finally {
      clearTimeout(timeoutId);
      this.refreshPromise = null;
    }
  }

  /**
   * Handle 401 - clear auth state and redirect to login.
   * Emits custom event for socket cleanup.
   * Debounced to prevent multiple rapid calls.
   */
  handleUnauthorized(): void {
    if (typeof window === "undefined" || this.isLoggingOut) return;
    this.isLoggingOut = true;

    localStorage.removeItem("token");
    localStorage.removeItem("sessionId");

    // Emit event for socket.ts to disconnect
    window.dispatchEvent(new CustomEvent("auth:logout"));

    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }

    // Reset flag after navigation (in case redirect fails)
    setTimeout(() => { this.isLoggingOut = false; }, 1000);
  }

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  createAuthHeaders(token?: string): Record<string, string> {
    const t = token ?? this.getToken();
    return {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    };
  }

  /**
   * Sanitize sensitive data from log messages.
   * Redacts JWTs, emails, and file paths.
   */
  private sanitize(value: string): string {
    return value
      // Redact JWT tokens (header.payload.signature format)
      .replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_TOKEN]")
      // Redact email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]")
      // Redact file paths (Unix and Windows)
      .replace(/(?:\/[\w.-]+)+|(?:[A-Z]:\\[\w\\.-]+)/g, "[REDACTED_PATH]");
  }

  /**
   * Log errors with sanitization.
   * Stack traces only shown in development.
   */
  private logError(context: string, error: unknown): void {
    let message: string;
    let stack: string | undefined;

    if (error instanceof Error) {
      message = this.sanitize(error.message);
      stack = IS_DEV ? error.stack : undefined;
    } else if (typeof error === "string") {
      // Error codes (e.g., "AUTH_FAILED") - no sanitization needed
      message = error;
    } else {
      message = "Unknown error";
    }

    const logPayload: Record<string, unknown> = {
      code: typeof error === "string" ? error : undefined,
      message,
      timestamp: new Date().toISOString(),
    };

    // Only include stack in development
    if (IS_DEV && stack) {
      logPayload.stack = this.sanitize(stack);
    }

    console.error(`[AuthService:${context}]`, logPayload);
  }
}

export const authService = AuthService.getInstance();

