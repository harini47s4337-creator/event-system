import { Router } from 'express';
import { store } from '../db/store.js';
import { cacheService } from '../services/cacheService.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { getSeedData } from '../db/seedData.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all admin routes with authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// GET /api/admin/stats - Platform Overview
router.get('/stats', (req, res) => {
  const stats = AnalyticsService.getPlatformOverview();
  return res.json({ stats });
});

// GET /api/admin/users - View all users
router.get('/users', (req, res) => {
  const db = store.get();
  const safeUsers = db.users.map(({ passwordHash, ...u }) => {
    const member = db.organizationMembers.find((m) => m.userId === u.id);
    const org = member ? db.organizations.find((o) => o.id === member.organizationId) : null;
    return {
      ...u,
      organization: org ? { id: org.id, name: org.name } : null,
    };
  });
  return res.json({ users: safeUsers });
});

// PATCH /api/admin/users/:id/status - Suspend or reactivate user
router.patch('/users/:id/status', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE' | 'SUSPENDED'

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ACTIVE or SUSPENDED.' });
    }

    await store.transaction(async (db) => {
      const u = db.users.find((x) => x.id === id);
      if (!u) throw new Error('User not found.');
      u.status = status;
      u.updatedAt = new Date().toISOString();

      db.auditLogs.push({
        id: 'aud-' + Math.random().toString(36).substring(2, 10),
        userId: req.user!.id,
        action: `USER_STATUS_${status}`,
        resourceType: 'USER',
        resourceId: id,
        details: `Admin changed status of ${u.email} to ${status}`,
        createdAt: new Date().toISOString(),
      });
    });

    return res.json({ message: `User status updated to ${status}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/organizations - View all organizations (tenants)
router.get('/organizations', (req, res) => {
  const db = store.get();
  const orgs = db.organizations.map((org) => {
    const owner = db.users.find((u) => u.id === org.ownerId);
    const eventCount = db.events.filter((e) => e.organizationId === org.id).length;
    const orgOrders = db.orders.filter((o) => {
      const evt = db.events.find((e) => e.id === o.eventId);
      return evt?.organizationId === org.id;
    });
    const totalRevenue = orgOrders.reduce((s, o) => s + Number(o.totalAmount), 0);

    return {
      ...org,
      owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null,
      eventCount,
      orderCount: orgOrders.length,
      totalRevenue,
    };
  });

  return res.json({ organizations: orgs });
});

// PATCH /api/admin/organizations/:id/status - Approve, suspend, or reactivate organization
router.patch('/organizations/:id/status', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE' | 'SUSPENDED' | 'PENDING'

    if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ACTIVE, SUSPENDED, or PENDING.' });
    }

    await store.transaction(async (db) => {
      const org = db.organizations.find((o) => o.id === id);
      if (!org) throw new Error('Organization not found.');
      org.status = status;
      org.updatedAt = new Date().toISOString();

      db.auditLogs.push({
        id: 'aud-' + Math.random().toString(36).substring(2, 10),
        userId: req.user!.id,
        action: `ORG_STATUS_${status}`,
        resourceType: 'ORGANIZATION',
        resourceId: id,
        details: `Admin updated organization ${org.name} status to ${status}`,
        createdAt: new Date().toISOString(),
      });
    });

    return res.json({ message: `Organization status updated to ${status}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/events - View all events across platform
router.get('/events', (req, res) => {
  const db = store.get();
  const events = db.events.map((event) => {
    const org = db.organizations.find((o) => o.id === event.organizationId);
    const tiers = db.ticketTiers.filter((t) => t.eventId === event.id);
    const orders = db.orders.filter((o) => o.eventId === event.id);
    const revenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const ticketsSold = tiers.reduce((s, t) => s + t.soldQuantity, 0);

    return {
      ...event,
      organizationName: org?.name || 'Unknown',
      ticketsSold,
      revenue,
      tiersCount: tiers.length,
    };
  });

  return res.json({ events });
});

// PATCH /api/admin/events/:id/status - Approve, reject, or suspend event
router.patch('/events/:id/status', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    await store.transaction(async (db) => {
      const evt = db.events.find((e) => e.id === id);
      if (!evt) throw new Error('Event not found.');
      evt.status = status;
      evt.updatedAt = new Date().toISOString();

      db.auditLogs.push({
        id: 'aud-' + Math.random().toString(36).substring(2, 10),
        userId: req.user!.id,
        action: `EVENT_MODERATION_${status}`,
        resourceType: 'EVENT',
        resourceId: id,
        details: `Admin changed status of "${evt.title}" to ${status}`,
        createdAt: new Date().toISOString(),
      });
    });

    await cacheService.invalidateEvent(id);
    return res.json({ message: `Event status updated to ${status}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/transactions - View all transactions & reservations
router.get('/transactions', (req, res) => {
  const db = store.get();
  const txns = db.transactions.map((txn) => {
    const order = db.orders.find((o) => o.id === txn.orderId);
    const resv = db.reservations.find((r) => r.id === txn.reservationId);
    const user = resv ? db.users.find((u) => u.id === resv.userId) : null;
    const event = resv ? db.events.find((e) => e.id === resv.eventId) : null;

    return {
      ...txn,
      bookingReference: order?.bookingReference,
      userName: user?.name,
      userEmail: user?.email,
      eventTitle: event?.title,
    };
  });

  txns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ transactions: txns });
});

// POST /api/admin/reseed - Reset database to initial pristine state
router.post('/reseed', async (req: AuthenticatedRequest, res) => {
  try {
    await store.transaction(async (db) => {
      const pristine = getSeedData();
      Object.assign(db, pristine);
    });

    await cacheService.invalidatePattern('*');
    return res.json({ message: 'Database reset to initial demo seeds.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export const adminRoutes = router;
