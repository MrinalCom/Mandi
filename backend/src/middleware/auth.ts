import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type UserRole = "farmer" | "buyer" | "admin";

export interface AuthedRequest extends Request {
  user?: { id: string; role: UserRole };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: UserRole };
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Decodes the token if present but never rejects — for endpoints that behave
// the same for anonymous and logged-in users, just with extra context when available.
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: UserRole };
    } catch {
      // ignore invalid token, treat as anonymous
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
