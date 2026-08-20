import type { AccessTokenPayload } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      /** Set by the auth middleware after JWT verification. */
      auth?: AccessTokenPayload;
      requestId?: string;
    }
  }
}

export {};
