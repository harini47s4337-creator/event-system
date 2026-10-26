import { Router } from 'express';
import { store } from '../db/store.js';
import { cacheService } from '../services/cacheService.js';

const router = Router();

// GET /api/events - Public published events listing with Redis caching and filters
router.get('/', async (req, res) => {
  try {
    const { category, search, dateFrom, dateTo, minPrice, maxPrice, orgId } = req.query;

    // Check cache for default query (no search parameters)
    const isUnfiltered = !category && !search && !dateFrom && !dateTo && !minPrice && !maxPrice && !orgId;
    if (isUnfiltered) {
      const cached = await cacheService.get<any[]>('events:published');
      if (cached) {
        return res.json({ events: cached, source: 'cache' });
      }
    }

    const db = store.get();

    // Only published events are publicly visible
    let events = db.events.filter((e) => e.status === 'PUBLISHED');

    if (category) {
      events = events.filter((e) => e.category.toLowerCase() === String(category).toLowerCase());
    }

    if (orgId) {
      events = events.filter((e) => e.organizationId === String(orgId));
    }

    if (search) {
      const term = String(search).toLowerCase();
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(term) ||
          e.description.toLowerCase().includes(term) ||
          e.venue.toLowerCase().includes(term) ||
          e.category.toLowerCase().includes(term)
      );
    }

    if (dateFrom) {
      const fromTime = new Date(String(dateFrom)).getTime();
      events = events.filter((e) => new Date(e.eventDate).getTime() >= fromTime);
    }

    if (dateTo) {
      const toTime = new Date(String(dateTo)).getTime();
      events = events.filter((e) => new Date(e.eventDate).getTime() <= toTime);
    }

    // Enrich events with organization and ticket pricing summary
    const enrichedEvents = events.map((event) => {
      const org = db.organizations.find((o) => o.id === event.organizationId);
      const tiers = db.ticketTiers.filter((t) => t.eventId === event.id);

      const minTicketPrice = tiers.length > 0 ? Math.min(...tiers.map((t) => Number(t.price))) : 0;
      const maxTicketPrice = tiers.length > 0 ? Math.max(...tiers.map((t) => Number(t.price))) : 0;
      const totalAvailable = tiers.reduce((sum, t) => sum + t.availableQuantity, 0);

      return {
        ...event,
        organization: org ? { id: org.id, name: org.name, logoUrl: org.logoUrl } : null,
        minPrice: minTicketPrice,
        maxPrice: maxTicketPrice,
        availableTickets: totalAvailable,
        tierCount: tiers.length,
      };
    });

    // Optional price filtering
    let finalEvents = enrichedEvents;
    if (minPrice) {
      finalEvents = finalEvents.filter((e) => e.minPrice >= Number(minPrice));
    }
    if (maxPrice) {
      finalEvents = finalEvents.filter((e) => e.minPrice <= Number(maxPrice));
    }

    // Sort by upcoming date
    finalEvents.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

    // Cache unfiltered results for 120 seconds
    if (isUnfiltered) {
      await cacheService.set('events:published', finalEvents, 120);
    }

    return res.json({ events: finalEvents, source: 'database' });
  } catch (err: any) {
    console.error('Error fetching events:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch events' });
  }
});

// GET /api/events/:id - Detailed event view with ticket tiers & announcements
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check Redis cache
    const cacheKey = `event:${id}`;
    const cached = await cacheService.get<any>(cacheKey);

    // Note: Always verify ticket availability freshness from authoritative store
    const db = store.get();
    const event = db.events.find((e) => e.id === id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Live ticket tiers from authoritative store
    const tiers = db.ticketTiers.filter((t) => t.eventId === id);
    const org = db.organizations.find((o) => o.id === event.organizationId);
    const announcements = db.eventAnnouncements
      .filter((a) => a.eventId === id)
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    const totalCapacity = event.capacity;
    const totalSold = tiers.reduce((s, t) => s + t.soldQuantity, 0);
    const totalAvailable = tiers.reduce((s, t) => s + t.availableQuantity, 0);
    const totalReserved = tiers.reduce((s, t) => s + t.reservedQuantity, 0);

    const isSoldOut = totalAvailable === 0 && totalReserved === 0;

    const payload = {
      ...event,
      isSoldOut,
      organization: org,
      ticketTiers: tiers,
      announcements,
      inventorySummary: {
        totalCapacity,
        totalSold,
        totalAvailable,
        totalReserved,
      },
    };

    // Cache non-volatile event data
    await cacheService.set(cacheKey, payload, 60);

    return res.json({ event: payload });
  } catch (err: any) {
    console.error('Error fetching event details:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch event details' });
  }
});

export const eventRoutes = router;
