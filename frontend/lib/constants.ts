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
  // Client to Server
  GAME_JOIN: "game:join",
  GAME_MOVE: "game:move",
  GAME_UNDO: "game:undo",
  GAME_HINT: "game:hint",
  GAME_HINT_APPLY: "game:hint:apply",
  GAME_SYNC: "game:sync",
  GAME_UPDATE_TIME: "game:updateTime",

  // Server to Client
  GAME_STATE: "game:state",
  GAME_TIME_UPDATED: "game:timeUpdated",
  GAME_ERROR: "game:error",
  GAME_JOINED: "game:joined",
  GAME_MOVE_SUCCESS: "game:move:success",
  GAME_UNDO_SUCCESS: "game:undo:success",
  GAME_HINT_SUCCESS: "game:hint:success",
  GAME_HINT_APPLY_SUCCESS: "game:hint:apply:success",
} as const;
