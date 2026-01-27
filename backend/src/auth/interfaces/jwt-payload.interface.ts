export interface JwtPayload {
  sub: string; // userId or sessionId
  email?: string;
  isAnonymous: boolean;
  iat?: number;
  exp?: number;
}
