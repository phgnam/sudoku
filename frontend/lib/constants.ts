export const GAME_CONFIG = {
  GRID_SIZE: 9,
  BOX_SIZE: 3,
  MAX_MISTAKES: 3,
  MAX_HINTS: 3,
  DIFFICULTIES: ["easy", "normal", "hard"] as const,
  UNLOCK_REQUIREMENTS: {
    normal: 3, // Complete 3 Easy games
    hard: 3, // Complete 3 Normal games
  },
} as const;

export const THEME_COLORS = {
  blue: {
    primary: "#3B82F6",
    secondary: "#60A5FA",
    accent: "#2563EB",
  },
  green: {
    primary: "#10B981",
    secondary: "#34D399",
    accent: "#059669",
  },
  orange: {
    primary: "#F59E0B",
    secondary: "#FBBF24",
    accent: "#D97706",
  },
} as const;

export const SOCKET_EVENTS = {
  // Client to Server - Single Player
  GAME_JOIN: "game:join",
  GAME_MOVE: "game:move",
  GAME_UNDO: "game:undo",
  GAME_HINT: "game:hint",
  GAME_HINT_APPLY: "game:hint:apply",
  GAME_SYNC: "game:sync",
  GAME_UPDATE_TIME: "game:updateTime",

  // Server to Client - Single Player
  GAME_STATE: "game:state",
  GAME_TIME_UPDATED: "game:timeUpdated",
  GAME_ERROR: "game:error",
  GAME_JOINED: "game:joined",
  GAME_MOVE_SUCCESS: "game:move:success",
  GAME_UNDO_SUCCESS: "game:undo:success",
  GAME_HINT_SUCCESS: "game:hint:success",
  GAME_HINT_APPLY_SUCCESS: "game:hint:apply:success",

  // Client to Server - Match (Competitive)
  MATCH_CREATE: "match:create",
  MATCH_JOIN: "match:join",
  MATCH_LEAVE: "match:leave",
  MATCH_SURRENDER: "match:surrender",
  MATCH_READY: "match:ready",
  MATCH_UNREADY: "match:unready",
  MATCH_MOVE: "match:move",
  MATCH_SUBMIT: "match:submit",
  MATCH_SYNC: "match:sync",

  // Server to Client - Match (Competitive)
  MATCH_CREATED: "match:created",
  MATCH_JOINED: "match:joined",
  MATCH_PLAYER_JOINED: "match:playerJoined",
  MATCH_PLAYER_LEFT: "match:playerLeft",
  MATCH_PLAYER_READY: "match:playerReady",
  MATCH_START: "match:start",
  MATCH_OPPONENT_PROGRESS: "match:opponentProgress",
  MATCH_OPPONENT_MOVED: "match:opponentMoved",
  MATCH_TIME_SYNC: "match:timeSync",
  MATCH_ENDED: "match:ended",
  MATCH_ERROR: "match:error",
  MATCH_CANCELLED: "match:cancelled",
  MATCH_SUBMIT_REJECTED: "match:submitRejected",
  // Rejoin event (reconnection)
  MATCH_REJOIN: "match:rejoin",
  // Spectator events
  MATCH_SPECTATE: "match:spectate",
  MATCH_SPECTATE_LEAVE: "match:spectateLeave",
  MATCH_SPECTATE_STATE: "match:spectateState",
  MATCH_SPECTATOR_COUNT: "match:spectatorCount",
  MATCH_SPECTATOR_UPDATE: "match:spectatorUpdate",
  MATCH_SPECTATOR_ENDED: "match:spectatorEnded",
  MATCH_ACTIVE_MATCHES: "match:activeMatches",
  // Rematch events
  MATCH_REMATCH_REQUEST: "match:rematchRequest",
  MATCH_REMATCH_DECLINE: "match:rematchDecline",
  MATCH_REMATCH_REQUESTED: "match:rematchRequested",
  MATCH_REMATCH_PENDING: "match:rematchPending",
  MATCH_REMATCH_CREATED: "match:rematchCreated",
  MATCH_REMATCH_DECLINED: "match:rematchDeclined",
  MATCH_REMATCH_EXPIRED: "match:rematchExpired",

  // Matchmaking events
  MATCHMAKING_JOIN: "matchmaking:join",
  MATCHMAKING_CANCEL: "matchmaking:cancel",
  MATCHMAKING_JOINED: "matchmaking:joined",
  MATCHMAKING_FOUND: "matchmaking:found",
  MATCHMAKING_STATUS: "matchmaking:status",
  MATCHMAKING_CANCELLED: "matchmaking:cancelled",

  // Mutation events (Server to Client)
  MUTATION_WARNING: "mutation:warning",
  MUTATION_OCCURRED: "mutation:occurred",
  MUTATION_STARTED: "mutation:started",
  MUTATION_STOPPED: "mutation:stopped",
} as const;

export const MATCH_CONFIG = {
  MAX_DURATION_MS: 20 * 60 * 1000, // 20 minutes
  RECONNECT_GRACE_PERIOD_MS: 30 * 1000, // 30 seconds
} as const;

export const MATCHMAKING_CONFIG = {
  INITIAL_SEARCH_RADIUS: 200,    // ±200 ELO points
  RADIUS_EXPAND_INTERVAL: 10000, // Expand every 10 seconds
  RADIUS_EXPAND_AMOUNT: 50,      // Add 50 points each expansion
  MAX_SEARCH_RADIUS: 500,        // Cap at ±500
  MATCH_CHECK_INTERVAL: 2000,    // Check for matches every 2s
  MAX_QUEUE_TIME: 300000,        // 5 minutes max wait
} as const;

export const MUTATION_CONFIG = {
  INTERVAL_MS: 30000,           // 30 seconds between mutations
  WARNING_BEFORE_MS: 5000,      // Show warning 5 seconds before
  ANIMATION_DURATION_MS: 800,   // Duration of mutation animation
} as const;

export const GAME_MODES = {
  CLASSIC: 'classic',
  MUTATING: 'mutating',
} as const;

export type GameMode = typeof GAME_MODES[keyof typeof GAME_MODES];
