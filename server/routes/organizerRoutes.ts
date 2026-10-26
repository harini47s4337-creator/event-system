import { Router } from 'express';
import { store } from '../db/store.js';
import { cacheService } from '../services/cacheService.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { authenticate, requireRole, requireOrganizerTenant, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { Event, TicketTier, EventAnnouncement } from '../db/types.js';

const router = Router();

// Protect all organizer routes with authentication and tenant isolation
router.use(authenticate);
router.use(requireRole('ORGANIZER', 'ADMIN'));
router.use(requireOrganizerTenant);

// GET /api/organizer/events - List events for authenticated organizer's organization
router.get('/events', (req: AuthenticatedRequest, res) => {
  const orgId = req.organizationId!;
  const db = store.get();
  const events = db.events.filter((e) => e.organizationId === orgId);

  const enriched = events.map((event) => {
    const tiers = db.ticketTiers.filter((t) => t.eventId === event.id);
    const orders = db.orders.filter((o) => o.eventId === event.id && o.status === 'CONFIRMED');
    const revenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const ticketsSold = tiers.reduce((s, t) => s + t.soldQuantity, 0);
    const totalCapacity = event.capacity;

    return {
      ...event,
      tiers,
      metrics: {
        ticketsSold,
        capacity: totalCapacity,
        revenue,
        occupancyRate: totalCapacity > 0 ? Math.round((ticketsSold / totalCapacity) * 100) : 0,
      },
    };
  });

  return res.json({ events: enriched });
});

// POST /api/organizer/events - Create new event within tenant
router.post('/events', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const {
      title,
      description,
      bannerUrl,
      category,
      venue,
      address,
      eventDate,
      startTime,
      endTime,
      salesStartAt,
      salesCutoffAt,
      capacity,
      initialTiers = [],
    } = req.body;

    if (!title || !description || !venue || !eventDate || !capacity) {
      return res.status(400).json({ error: 'Missing required event fields.' });
    }

    if (Number(capacity) <= 0) {
      return res.status(400).json({ error: 'Capacity must be greater than zero.' });
    }

    // Validate tier quantities sum <= capacity
    if (initialTiers.length > 0) {
      const sumTierQty = initialTiers.reduce((s: number, t: any) => s + Number(t.totalQuantity || 0), 0);
      if (sumTierQty > Number(capacity)) {
        return res.status(400).json({
          error: `Total tier quantities (${sumTierQty}) cannot exceed event capacity (${capacity}).`,
        });
      }
    }

    const eventId = 'evt-' + Math.random().toString(36).substring(2, 10);
    const now = new Date().toISOString();

    const newEvent: Event = {
      id: eventId,
      organizationId: orgId,
      title,
      description,
      bannerUrl:
        bannerUrl ||
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
      category: category || 'General',
      venue,
      address: address || venue,
      eventDate: new Date(eventDate).toISOString(),
      startTime: startTime || '18:00',
      endTime: endTime || '22:00',
      salesStartAt: salesStartAt ? new Date(salesStartAt).toISOString() : now,
      salesCutoffAt: salesCutoffAt ? new Date(salesCutoffAt).toISOString() : new Date(eventDate).toISOString(),
      capacity: Number(capacity),
      status: 'DRAFT', // Events start as DRAFT
      createdAt: now,
      updatedAt: now,
    };

    const createdTiers: TicketTier[] = [];

    await store.transaction(async (db) => {
      db.events.push(newEvent);

      for (const t of initialTiers) {
        const qty = Number(t.totalQuantity);
        const tier: TicketTier = {
          id: 'tier-' + Math.random().toString(36).substring(2, 10),
          eventId,
          name: t.name,
          price: Number(t.price),
          totalQuantity: qty,
          availableQuantity: qty,
          reservedQuantity: 0,
          soldQuantity: 0,
          salesStartAt: t.salesStartAt ? new Date(t.salesStartAt).toISOString() : undefined,
          salesEndAt: t.salesEndAt ? new Date(t.salesEndAt).toISOString() : undefined,
          createdAt: now,
          updatedAt: now,
        };
        db.ticketTiers.push(tier);
        createdTiers.push(tier);
      }

      db.auditLogs.push({
        id: 'aud-' + Math.random().toString(36).substring(2, 10),
        userId: req.user!.id,
        action: 'EVENT_CREATED',
        resourceType: 'EVENT',
        resourceId: eventId,
        details: `Created event "${title}" in tenant ${orgId}`,
        createdAt: now,
      });
    });

    return res.status(201).json({
      message: 'Event created successfully in draft mode.',
      event: newEvent,
      ticketTiers: createdTiers,
    });
  } catch (err: any) {
    console.error('Error creating event:', err);
    return res.status(500).json({ error: err.message || 'Failed to create event.' });
  }
});

// PUT /api/organizer/events/:id - Update event (tenant-isolated)
router.put('/events/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { id } = req.params;
    const db = store.get();

    const event = db.events.find((e) => e.id === id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Strict tenant check
    if (event.organizationId !== orgId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized: Cannot modify events belonging to another tenant.' });
    }

    const {
      title,
      description,
      bannerUrl,
      category,
      venue,
      address,
      eventDate,
      startTime,
      endTime,
      salesStartAt,
      salesCutoffAt,
      capacity,
    } = req.body;

    // Validate new capacity is not less than already sold tickets
    const existingTiers = db.ticketTiers.filter((t) => t.eventId === id);
    const totalSold = existingTiers.reduce((s, t) => s + t.soldQuantity, 0);

    if (capacity && Number(capacity) < totalSold) {
      return res.status(400).json({
        error: `Cannot reduce capacity to ${capacity}. Already sold ${totalSold} tickets.`,
      });
    }

    let updatedEvent: Event | undefined;

    await store.transaction(async (dbStore) => {
      const e = dbStore.events.find((x) => x.id === id)!;
      if (title) e.title = title;
      if (description) e.description = description;
      if (bannerUrl) e.bannerUrl = bannerUrl;
      if (category) e.category = category;
      if (venue) e.venue = venue;
      if (address) e.address = address;
      if (eventDate) e.eventDate = new Date(eventDate).toISOString();
      if (startTime) e.startTime = startTime;
      if (endTime) e.endTime = endTime;
      if (salesStartAt) e.salesStartAt = new Date(salesStartAt).toISOString();
      if (salesCutoffAt) e.salesCutoffAt = new Date(salesCutoffAt).toISOString();
      if (capacity) e.capacity = Number(capacity);
      e.updatedAt = new Date().toISOString();

      updatedEvent = e;
    });

    // Invalidate Redis cache
    await cacheService.invalidateEvent(id);

    return res.json({ message: 'Event updated successfully.', event: updatedEvent });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update event.' });
  }
});

// PATCH /api/organizer/events/:id/publish - Toggle publish/draft
router.patch('/events/:id/publish', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { id } = req.params;
    const { status } = req.body; // 'PUBLISHED' or 'DRAFT'
    const db = store.get();

    const event = db.events.find((e) => e.id === id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    if (event.organizationId !== orgId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized: Cannot modify events belonging to another tenant.' });
    }

    const tiers = db.ticketTiers.filter((t) => t.eventId === id);
    if (status === 'PUBLISHED' && tiers.length === 0) {
      return res.status(400).json({ error: 'Cannot publish event without at least one ticket tier.' });
    }

    await store.transaction(async (dbStore) => {
      const e = dbStore.events.find((x) => x.id === id)!;
      e.status = status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
      e.updatedAt = new Date().toISOString();
    });

    await cacheService.invalidateEvent(id);
    return res.json({ message: `Event status updated to ${status}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/organizer/events/:id - Delete event if no tickets have been sold
router.delete('/events/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { id } = req.params;
    const db = store.get();

    const event = db.events.find((e) => e.id === id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    if (event.organizationId !== orgId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized: Cannot modify events belonging to another tenant.' });
    }

    const tiers = db.ticketTiers.filter((t) => t.eventId === id);
    const hasSold = tiers.some((t) => t.soldQuantity > 0 || t.reservedQuantity > 0);
    if (hasSold) {
      return res.status(400).json({
        error: 'Cannot delete event with existing ticket reservations or sales. You may cancel it instead.',
      });
    }

    await store.transaction(async (dbStore) => {
      dbStore.events = dbStore.events.filter((e) => e.id !== id);
      dbStore.ticketTiers = dbStore.ticketTiers.filter((t) => t.eventId !== id);
      dbStore.eventAnnouncements = dbStore.eventAnnouncements.filter((a) => a.eventId !== id);
    });

    await cacheService.invalidateEvent(id);
    return res.json({ message: 'Event deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/organizer/events/:eventId/tickets - Create ticket tier
router.post('/events/:eventId/tickets', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { eventId } = req.params;
    const { name, price, totalQuantity } = req.body;

    const db = store.get();
    const event = db.events.find((e) => e.id === eventId);
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    if (event.organizationId !== orgId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized access.' });
    }

    if (!name || price === undefined || !totalQuantity) {
      return res.status(400).json({ error: 'Name, price, and totalQuantity are required.' });
    }

    // Validate capacity
    const currentTiers = db.ticketTiers.filter((t) => t.eventId === eventId);
    const existingTotal = currentTiers.reduce((s, t) => s + t.totalQuantity, 0);
    const newTotal = existingTotal + Number(totalQuantity);

    if (newTotal > event.capacity) {
      return res.status(400).json({
        error: `Total tier tickets (${newTotal}) would exceed event capacity (${event.capacity}). Available capacity left: ${
          event.capacity - existingTotal
        }`,
      });
    }

    const tierId = 'tier-' + Math.random().toString(36).substring(2, 10);
    const now = new Date().toISOString();

    const newTier: TicketTier = {
      id: tierId,
      eventId,
      name,
      price: Number(price),
      totalQuantity: Number(totalQuantity),
      availableQuantity: Number(totalQuantity),
      reservedQuantity: 0,
      soldQuantity: 0,
      createdAt: now,
      updatedAt: now,
    };

    await store.transaction(async (dbStore) => {
      dbStore.ticketTiers.push(newTier);
    });

    await cacheService.invalidateEvent(eventId);
    return res.status(201).json({ message: 'Ticket tier created successfully.', ticketTier: newTier });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/organizer/tickets/:id - Update ticket tier
router.put('/tickets/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { id } = req.params;
    const { name, price, totalQuantity } = req.body;

    const db = store.get();
    const tier = db.ticketTiers.find((t) => t.id === id);
    if (!tier) return res.status(404).json({ error: 'Ticket tier not found.' });

    const event = db.events.find((e) => e.id === tier.eventId);
    if (!event || (event.organizationId !== orgId && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    if (totalQuantity !== undefined) {
      const minAllowable = tier.soldQuantity + tier.reservedQuantity;
      if (Number(totalQuantity) < minAllowable) {
        return res.status(400).json({
          error: `Cannot decrease total quantity below current sold (${tier.soldQuantity}) + reserved (${tier.reservedQuantity}) = ${minAllowable}`,
        });
      }
    }

    await store.transaction(async (dbStore) => {
      const t = dbStore.ticketTiers.find((x) => x.id === id)!;
      if (name) t.name = name;
      if (price !== undefined) t.price = Number(price);
      if (totalQuantity !== undefined) {
        const diff = Number(totalQuantity) - t.totalQuantity;
        t.totalQuantity = Number(totalQuantity);
        t.availableQuantity += diff;
      }
      t.updatedAt = new Date().toISOString();
    });

    await cacheService.invalidateEvent(tier.eventId);
    return res.json({ message: 'Ticket tier updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/organizer/tickets/:id - Delete ticket tier
router.delete('/tickets/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { id } = req.params;

    const db = store.get();
    const tier = db.ticketTiers.find((t) => t.id === id);
    if (!tier) return res.status(404).json({ error: 'Ticket tier not found.' });

    const event = db.events.find((e) => e.id === tier.eventId);
    if (!event || (event.organizationId !== orgId && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    if (tier.soldQuantity > 0 || tier.reservedQuantity > 0) {
      return res.status(400).json({ error: 'Cannot delete tier with sold or reserved tickets.' });
    }

    await store.transaction(async (dbStore) => {
      dbStore.ticketTiers = dbStore.ticketTiers.filter((t) => t.id !== id);
    });

    await cacheService.invalidateEvent(tier.eventId);
    return res.json({ message: 'Ticket tier deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/organizer/bookings - View attendee bookings associated with organizer events
router.get('/bookings', (req: AuthenticatedRequest, res) => {
  const orgId = req.organizationId!;
  const db = store.get();

  const orgEvents = db.events.filter((e) => e.organizationId === orgId);
  const eventIds = new Set(orgEvents.map((e) => e.id));

  const orders = db.orders.filter((o) => eventIds.has(o.eventId));

  const enrichedBookings = orders.map((order) => {
    const event = orgEvents.find((e) => e.id === order.eventId);
    const orderItems = db.orderItems.filter((oi) => oi.orderId === order.id);
    const items = orderItems.map((oi) => {
      const tier = db.ticketTiers.find((t) => t.id === oi.ticketTierId);
      return {
        ...oi,
        tierName: tier ? tier.name : 'Unknown Tier',
      };
    });

    return {
      ...order,
      eventTitle: event?.title || 'Unknown Event',
      items,
    };
  });

  enrichedBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ bookings: enrichedBookings });
});

// GET /api/organizer/export/bookings - Export booking report (CSV)
router.get('/export/bookings', (req: AuthenticatedRequest, res) => {
  const orgId = req.organizationId!;
  const db = store.get();

  const orgEvents = db.events.filter((e) => e.organizationId === orgId);
  const eventIds = new Set(orgEvents.map((e) => e.id));
  const orders = db.orders.filter((o) => eventIds.has(o.eventId));

  const rows = [
    ['Booking Reference', 'Event Title', 'Attendee Name', 'Attendee Email', 'Total Amount', 'Status', 'Date'],
  ];

  for (const o of orders) {
    const event = orgEvents.find((e) => e.id === o.eventId);
    rows.push([
      o.bookingReference,
      `"${(event?.title || '').replace(/"/g, '""')}"`,
      `"${o.attendeeName.replace(/"/g, '""')}"`,
      o.attendeeEmail,
      `$${o.totalAmount.toFixed(2)}`,
      o.status,
      o.createdAt,
    ]);
  }

  const csvContent = rows.map((r) => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="event_bookings_report.csv"');
  return res.send(csvContent);
});

// POST /api/organizer/events/:eventId/announcements - Create announcement
router.post('/events/:eventId/announcements', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const { eventId } = req.params;
    const { title, content, isPinned = false } = req.body;

    const db = store.get();
    const event = db.events.find((e) => e.id === eventId);
    if (!event || (event.organizationId !== orgId && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const ancId = 'anc-' + Math.random().toString(36).substring(2, 10);
    const newAnc: EventAnnouncement = {
      id: ancId,
      eventId,
      organizationId: orgId,
      title,
      content,
      isPinned: Boolean(isPinned),
      createdAt: new Date().toISOString(),
    };

    await store.transaction(async (dbStore) => {
      dbStore.eventAnnouncements.push(newAnc);
    });

    await cacheService.invalidateEvent(eventId);
    return res.status(201).json({ announcement: newAnc });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/organizer/analytics/overview
router.get('/analytics/overview', (req: AuthenticatedRequest, res) => {
  const orgId = req.organizationId!;
  const data = AnalyticsService.getOrganizerOverview(orgId);
  return res.json(data);
});

// GET /api/organizer/analytics/revenue
router.get('/analytics/revenue', (req: AuthenticatedRequest, res) => {
  const orgId = req.organizationId!;
  const data = AnalyticsService.getOrganizerOverview(orgId);
  return res.json({ revenueOverTime: data.revenueOverTime });
});

// GET /api/organizer/analytics/tickets
router.get('/analytics/tickets', (req: AuthenticatedRequest, res) => {
  const orgId = req.organizationId!;
  const data = AnalyticsService.getOrganizerOverview(orgId);
  return res.json({ ticketsByCategory: data.ticketsByCategory, eventComparison: data.eventComparison });
});

// GET /api/organizer/analytics/conversion
router.get('/analytics/conversion', (req: AuthenticatedRequest, res) => {
  const orgId = req.organizationId!;
  const data = AnalyticsService.getOrganizerOverview(orgId);
  return res.json({ conversionFunnel: data.conversionFunnel, conversionRate: data.kpi.conversionRate });
});

export const organizerRoutes = router;
