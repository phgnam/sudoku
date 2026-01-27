// Socket data interface
export interface SocketData {
  userId: string;
  isAnonymous: boolean;
}

// JWT payload interface
export interface JwtPayload {
  sub: string;
  isAnonymous?: boolean;
}

// Server to client events (what server sends to client)
export interface ServerToClientEvents {
  'game:state': (data: {
    gameId: string;
    currentState: number[][];
    moveHistory: unknown[];
    mistakes: number;
    status: string;
    timeElapsed?: number;
    hintsUsed?: number;
    hintedCells?: Array<{ row: number; col: number }>;
  }) => void;
  'game:timeUpdated': (data: { gameId: string; timeElapsed: number }) => void;
}

// Client to server events (what client sends to server)
export interface ClientToServerEvents {
  'game:join': (data: { gameId: string }) => void;
  'game:move': (data: {
    gameId: string;
    row: number;
    col: number;
    value: number;
  }) => void;
  'game:undo': (data: { gameId: string }) => void;
  'game:hint': (data: { gameId: string }) => void;
  'game:sync': (data: { gameId: string }) => void;
  'game:updateTime': (data: { gameId: string; timeElapsed: number }) => void;
}

// Inter-server events (for scaling with multiple servers)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InterServerEvents {
  // Empty for now
}

// Import Socket with proper generics
import { Socket as BaseSocket, Server as BaseServer } from 'socket.io';

// Properly typed Socket using Socket.io generics
export type TypedSocket = BaseSocket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// Properly typed Server using Socket.io generics
export type TypedServer = BaseServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
