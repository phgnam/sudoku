import { io, Socket } from "socket.io-client";
import { authService } from "./auth-service";

const GUEST_NAME_KEY = "sudoku_guest_name";

// Generate and persist guest name for anonymous users
function getOrCreateGuestName(): string {
  if (typeof window === "undefined") {
    return `Guest_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  let guestName = localStorage.getItem(GUEST_NAME_KEY);
  if (!guestName) {
    guestName = `Guest_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    localStorage.setItem(GUEST_NAME_KEY, guestName);
  }
  return guestName;
}

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private playerName: string | null = null;
  private logoutHandler: (() => void) | null = null;
  private handlersAttached = false;
  private isReconnecting = false;

  connect(token: string, name?: string): Socket | null {
    // Validate token
    if (!token) {
      console.warn("[Socket] Cannot connect with empty token");
      return null;
    }

    // Update player name if provided, otherwise use stored guest name
    if (name) {
      this.playerName = name;
    } else if (!this.playerName) {
      this.playerName = getOrCreateGuestName();
    }

    if (this.socket?.connected) {
      return this.socket;
    }

    this.token = token;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";

    this.socket = io(wsUrl, {
      auth: {
        token,
        name: this.playerName,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventHandlers();

    return this.socket;
  }

  // Update player name and reconnect if needed
  setPlayerName(name: string) {
    this.playerName = name;
    // If already connected, disconnect and reconnect with new name
    if (this.socket?.connected && this.token) {
      this.socket.disconnect();
      this.socket = null;
      this.connect(this.token, name);
    }
  }

  private setupEventHandlers() {
    if (!this.socket || this.handlersAttached) return;
    this.handlersAttached = true;

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Handle token expiring soon - use centralized auth service with deduplication
    this.socket.on("auth:expiringSoon", async () => {
      if (this.isReconnecting) return; // Prevent race condition
      this.isReconnecting = true;

      console.log("[Socket] Token expiring soon, refreshing...");
      try {
        const newToken = await authService.refreshTokenIfNeeded();
        if (newToken && newToken !== this.token) {
          // Reconnect with new token
          this.disconnect();
          this.connect(newToken, this.playerName ?? undefined);
        }
      } catch (error) {
        console.error("[Socket] Token refresh failed:", error);
        this.disconnect();
        authService.handleUnauthorized();
      } finally {
        this.isReconnecting = false;
      }
    });

    // Handle token expired error - use centralized logout
    this.socket.on("error", (data: { code?: string; message?: string }) => {
      if (data.code === "TOKEN_EXPIRED") {
        console.log("[Socket] Token expired, logging out...");
        this.disconnect();
        authService.handleUnauthorized();
      }
    });

    // Listen for auth logout event from authService (with cleanup support)
    if (typeof window !== "undefined" && !this.logoutHandler) {
      this.logoutHandler = () => {
        console.log("[Socket] Auth logout event received, disconnecting...");
        this.disconnect();
      };
      window.addEventListener("auth:logout", this.logoutHandler);
    }
  }

  disconnect() {
    // Remove auth logout listener to prevent memory leak
    if (this.logoutHandler && typeof window !== "undefined") {
      window.removeEventListener("auth:logout", this.logoutHandler);
      this.logoutHandler = null;
    }
    // Reset handlers flag so they can be re-attached on next connect
    this.handlersAttached = false;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
