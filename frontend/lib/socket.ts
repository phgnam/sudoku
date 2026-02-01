import { io, Socket } from "socket.io-client";

const GUEST_NAME_KEY = "sudoku_guest_name";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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

  connect(token: string, name?: string) {
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
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Handle token expiring soon - refresh and reconnect
    this.socket.on("auth:expiringSoon", async () => {
      console.log("Token expiring soon, refreshing...");
      try {
        const currentToken = localStorage.getItem("token");
        if (!currentToken) return;

        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const { accessToken } = await response.json();
          localStorage.setItem("token", accessToken);
          // Reconnect with new token
          this.disconnect();
          this.connect(accessToken, this.playerName ?? undefined);
        } else {
          // Token refresh failed - redirect to login
          console.error("Token refresh failed with status:", response.status);
          this.disconnect();
          localStorage.removeItem("token");
          localStorage.removeItem("sessionId");
          window.location.href = "/login";
        }
      } catch (error) {
        console.error("Failed to refresh token:", error);
        // Network error during refresh - redirect to login
        this.disconnect();
        localStorage.removeItem("token");
        localStorage.removeItem("sessionId");
        window.location.href = "/login";
      }
    });

    // Handle token expired error - redirect to login
    this.socket.on("error", (data: { code?: string; message?: string }) => {
      if (data.code === "TOKEN_EXPIRED") {
        console.log("Token expired, redirecting to login...");
        this.disconnect();
        localStorage.removeItem("token");
        localStorage.removeItem("sessionId");
        window.location.href = "/login";
      }
    });
  }

  disconnect() {
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
