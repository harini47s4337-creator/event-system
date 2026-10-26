import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { store } from '../db/store.js';
import { generateToken, authenticate, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { Role, User, Organization } from '../db/types.js';

const router = Router();

// Register new User (Attendee or Organizer)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'ATTENDEE', organizationName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const targetRole = role.toUpperCase() as Role;
    if (!['ATTENDEE', 'ORGANIZER'].includes(targetRole)) {
      return res.status(400).json({ error: 'Role must be either ATTENDEE or ORGANIZER.' });
    }

    const db = store.get();
    const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const userId = 'usr-' + Math.random().toString(36).substring(2, 10);

    const newUser: User = {
      id: userId,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: targetRole,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    let newOrg: Organization | undefined;

    await store.transaction(async (dbStore) => {
      dbStore.users.push(newUser);

      if (targetRole === 'ORGANIZER') {
        const orgId = 'org-' + Math.random().toString(36).substring(2, 10);
        const orgName = organizationName || `${name}'s Events`;
        const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

        newOrg = {
          id: orgId,
          name: orgName,
          slug,
          ownerId: userId,
          status: 'ACTIVE',
          description: `Event Organization owned by ${name}`,
          createdAt: now,
          updatedAt: now,
        };

        dbStore.organizations.push(newOrg);
        dbStore.organizationMembers.push({
          id: 'mem-' + Math.random().toString(36).substring(2, 10),
          organizationId: orgId,
          userId,
          role: 'OWNER',
          createdAt: now,
        });
      }

      dbStore.auditLogs.push({
        id: 'aud-' + Math.random().toString(36).substring(2, 10),
        userId,
        action: 'USER_REGISTERED',
        resourceType: 'USER',
        resourceId: userId,
        details: `Registered new ${targetRole}: ${email}`,
        createdAt: now,
      });
    });

    const token = generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;

    return res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: safeUser,
      organization: newOrg,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during registration.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = store.get();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact platform administrators.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let organization: Organization | undefined;
    if (user.role === 'ORGANIZER') {
      const membership = db.organizationMembers.find((m) => m.userId === user.id);
      if (membership) {
        organization = db.organizations.find((o) => o.id === membership.organizationId);
      } else {
        organization = db.organizations.find((o) => o.ownerId === user.id);
      }
    }

    const token = generateToken(user);
    const { passwordHash: _, ...safeUser } = user;

    return res.json({
      message: 'Login successful',
      token,
      user: safeUser,
      organization,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during login.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  return res.json({ message: 'Logged out successfully.' });
});

// Get current authenticated user
router.get('/me', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = store.get();
  let organization: Organization | undefined;

  if (user.role === 'ORGANIZER') {
    const membership = db.organizationMembers.find((m) => m.userId === user.id);
    const orgId = membership?.organizationId || req.organizationId;
    if (orgId) {
      organization = db.organizations.find((o) => o.id === orgId);
    }
  }

  const { passwordHash: _, ...safeUser } = user;
  return res.json({
    user: safeUser,
    organization,
  });
});

export const authRoutes = router;
