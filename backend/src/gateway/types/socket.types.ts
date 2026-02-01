// Socket auth state for token expiry handling
export interface SocketAuthState {
  userId: string;
  tokenExp: number;
  refreshAt: number;
}

// Socket data interface
export interface SocketData {
  userId: string;
  isAnonymous: boolean;
  name?: string;
  matchId?: string;
  authState?: SocketAuthState;
}

// JWT payload interface
export interface JwtPayload {
  sub: string;
  isAnonymous?: boolean;
}

// Player info for match events
export interface MatchPlayer {
  id: string;
  name: string;
}

// Server to client events (what server sends to client)
export interface ServerToClientEvents {
  // Single player game events
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

  // Match (competitive) events
  'match:created': (data: { matchId: string; difficulty: string }) => void;
  'match:joined': (data: { matchId: string; opponent: MatchPlayer }) => void;
  'match:playerJoined': (data: { opponent: MatchPlayer }) => void;
  'match:playerLeft': (data: { reason: string }) => void;
  'match:playerReconnected': (data: {
    playerId: string;
    playerName: string;
  }) => void;
  'match:playerReady': (data: { playerId: string; ready: boolean }) => void;
  'match:start': (data: {
    puzzle: number[][];
    startTime: number;
    maxDuration: number;
    opponent: MatchPlayer;
  }) => void;
  'match:opponentProgress': (data: {
    filledCells: string[];
    filledCount: number;
    totalEmpty: number;
  }) => void;
  'match:opponentMoved': (data: { row: number; col: number }) => void;
  'match:timeSync': (data: { serverTime: number; remaining: number }) => void;
  'match:ended': (data: {
    result: 'win' | 'lose' | 'draw';
    winnerId?: string;
    reason: string;
    yourTime?: number;
    opponentTime?: number;
    ratingChange?: number;
    newRating?: number;
    opponentRatingChange?: number;
  }) => void;
  'match:error': (data: { message: string; code?: string }) => void;
  'match:cancelled': (data: { reason: string }) => void;
  'match:submitRejected': (data: { reason: string }) => void;

  // Spectator events
  'match:spectatorCount': (data: { count: number }) => void;
  'match:spectateState': (data: {
    matchId: string;
    status: string;
    hostId: string;
    hostName: string;
    guestId: string | null;
    guestName: string | null;
    hostState: number[][] | null;
    guestState: number[][] | null;
    puzzle: number[][] | null;
    difficulty: string;
    startTime: number | null;
    spectatorCount: number;
  }) => void;
  'match:spectatorUpdate': (data: {
    playerId: string;
    playerRole: 'host' | 'guest';
    row: number;
    col: number;
    value: number;
    hostState: number[][] | null;
    guestState: number[][] | null;
  }) => void;
  'match:spectatorEnded': (data: {
    matchId: string;
    winnerId?: string;
    result: string;
    reason: string;
    hostName: string;
    guestName: string | null;
  }) => void;

  // Rejoin event (for reconnection)
  'match:rejoin': (data: {
    matchId: string;
    status: string;
    isHost: boolean;
    difficulty: string;
    opponent: MatchPlayer;
    puzzle: number[][];
    myState: number[][];
    startTime: number;
    maxDuration: number;
    opponentFilledCells: string[];
    opponentFilledCount: number;
    spectatorCount: number;
  }) => void;

  // Rematch events
  'match:rematchRequested': (data: {
    requestedBy: string;
    requestedByName: string;
  }) => void;
  'match:rematchPending': (data: { waitingFor: string }) => void;
  'match:rematchCreated': (data: {
    newMatchId: string;
    hostId: string;
    guestId: string;
    hostName: string;
    guestName: string;
    difficulty: string;
  }) => void;
  'match:rematchDeclined': (data: { declinedBy: string }) => void;
  'match:rematchExpired': (data: Record<string, never>) => void;

  // Matchmaking events
  'matchmaking:joined': (data: {
    position: number;
    estimatedWait: number;
    searchRadius: number;
  }) => void;
  'matchmaking:found': (data: {
    matchId: string;
    opponent: {
      opponentId: string;
      opponentName: string;
      opponentRating: number;
    };
  }) => void;
  'matchmaking:status': (data: {
    position: number;
    estimatedWait: number;
    searchRadius: number;
  }) => void;
  'matchmaking:cancelled': (data: { reason: string }) => void;
}

// Client to server events (what client sends to server)
export interface ClientToServerEvents {
  // Single player game events
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

  // Match (competitive) events
  'match:create': (data: { difficulty: string }) => void;
  'match:join': (data: { matchId: string }) => void;
  'match:leave': (data: { matchId: string }) => void;
  'match:ready': (data: { matchId: string }) => void;
  'match:unready': (data: { matchId: string }) => void;
  'match:move': (data: {
    matchId: string;
    row: number;
    col: number;
    value: number;
  }) => void;
  'match:submit': (data: { matchId: string }) => void;
  'match:sync': (data: { matchId: string }) => void;

  // Spectator events
  'match:spectate': (data: { matchId: string }) => void;
  'match:spectateLeave': (data: { matchId: string }) => void;
  'match:activeMatches': () => void;

  // Rematch events
  'match:rematchRequest': (data: { matchId: string }) => void;
  'match:rematchDecline': (data: { matchId: string }) => void;

  // Matchmaking events
  'matchmaking:join': (data: { difficulty: string }) => void;
  'matchmaking:cancel': () => void;
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
