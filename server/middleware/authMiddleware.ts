import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { store } from '../db/store.js';
import { Role, User } from '../db/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'eventsphere-jwt-secret-production-grade-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
  organizationId?: string;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: Role };
    const db = store.get();
    const user = db.users.find((u) => u.id === payload.id);

    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
    }

    req.user = user;

    // If organizer, attach organization ID
    if (user.role === 'ORGANIZER') {
      const membership = db.organizationMembers.find((m) => m.userId === user.id);
      const ownedOrg = db.organizations.find((o) => o.ownerId === user.id);
      req.organizationId = membership ? membership.organizationId : ownedOrg?.id;
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
      });
    }

    next();
  };
}

export function requireOrganizerTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  // Admins can bypass tenant restriction
  if (req.user.role === 'ADMIN') {
    return next();
  }

  if (req.user.role !== 'ORGANIZER') {
    return res.status(403).json({ error: 'Access denied. Organizer role required.' });
  }

  const db = store.get();
  const membership = db.organizationMembers.find((m) => m.userId === req.user!.id);
  const ownedOrg = db.organizations.find((o) => o.ownerId === req.user!.id);
  const orgId = membership?.organizationId || ownedOrg?.id;

  if (!orgId) {
    return res.status(403).json({ error: 'Organizer is not associated with any organization tenant.' });
  }

  const org = db.organizations.find((o) => o.id === orgId);
  if (!org) {
    return res.status(403).json({ error: 'Organization tenant not found.' });
  }

  if (org.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Your organization account has been suspended.' });
  }

  req.organizationId = orgId;
  next();
}
