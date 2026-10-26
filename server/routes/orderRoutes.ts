import { Router } from 'express';
import { store } from '../db/store.js';
import { authenticate, AuthenticatedRequest } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/orders - List bookings for current user
router.get('/', authenticate, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const db = store.get();

  const userOrders = req.user!.role === 'ADMIN' ? db.orders : db.orders.filter((o) => o.userId === userId);

  const enriched = userOrders.map((order) => {
    const event = db.events.find((e) => e.id === order.eventId);
    const orderItems = db.orderItems.filter((oi) => oi.orderId === order.id);
    const items = orderItems.map((oi) => {
      const tier = db.ticketTiers.find((t) => t.id === oi.ticketTierId);
      return {
        ...oi,
        tierName: tier ? tier.name : 'General Admission',
      };
    });

    return {
      ...order,
      event: event ? { id: event.id, title: event.title, bannerUrl: event.bannerUrl, venue: event.venue, eventDate: event.eventDate, startTime: event.startTime } : null,
      items,
      totalTickets: items.reduce((s, it) => s + it.quantity, 0),
    };
  });

  enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ orders: enriched });
});

// GET /api/orders/:id - Get detailed order confirmation & ticket passes
router.get('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const db = store.get();

  const order = db.orders.find((o) => o.id === id || o.bookingReference === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  if (order.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const event = db.events.find((e) => e.id === order.eventId);
  const org = event ? db.organizations.find((o) => o.id === event.organizationId) : null;
  const orderItems = db.orderItems.filter((oi) => oi.orderId === order.id);
  const transaction = db.transactions.find((t) => t.orderId === order.id);

  const items = orderItems.map((oi) => {
    const tier = db.ticketTiers.find((t) => t.id === oi.ticketTierId);
    return {
      ...oi,
      tierName: tier ? tier.name : 'Admission',
    };
  });

  return res.json({
    order: {
      ...order,
      event,
      organization: org,
      items,
      transaction,
    },
  });
});

// POST /api/orders/:id/cancel - Cancel booking according to event rules
router.post('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = store.get();

    const order = db.orders.find((o) => o.id === id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    if (order.status !== 'CONFIRMED') {
      return res.status(400).json({ error: `Cannot cancel order with status: ${order.status}` });
    }

    const event = db.events.find((e) => e.id === order.eventId);
    if (event && new Date(event.eventDate) <= new Date()) {
      return res.status(400).json({ error: 'Cannot cancel booking for an event that has already started or completed.' });
    }

    await store.transaction(async (dbStore) => {
      const o = dbStore.orders.find((x) => x.id === id)!;
      o.status = 'CANCELLED';
      o.updatedAt = new Date().toISOString();

      // Return sold tickets back to available inventory
      const items = dbStore.orderItems.filter((oi) => oi.orderId === id);
      for (const item of items) {
        const tier = dbStore.ticketTiers.find((t) => t.id === item.ticketTierId);
        if (tier) {
          tier.soldQuantity = Math.max(0, tier.soldQuantity - item.quantity);
          tier.availableQuantity += item.quantity;
          tier.updatedAt = new Date().toISOString();
        }
      }

      dbStore.auditLogs.push({
        id: 'aud-' + Math.random().toString(36).substring(2, 10),
        userId: req.user!.id,
        action: 'ORDER_CANCELLED',
        resourceType: 'ORDER',
        resourceId: id,
        details: `Cancelled booking ${order.bookingReference}. Released tickets.`,
        createdAt: new Date().toISOString(),
      });
    });

    return res.json({ message: 'Booking cancelled successfully. Inventory restored.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export const orderRoutes = router;
