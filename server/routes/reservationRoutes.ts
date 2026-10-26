import { Router } from 'express';
import { store } from '../db/store.js';
import { reservationWorker } from '../services/reservationWorker.js';
import { authenticate, AuthenticatedRequest } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/reservations - Atomic 10-minute ticket hold
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { eventId, items, idempotencyKey } = req.body;

    if (!eventId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'eventId and non-empty items array are required.' });
    }

    const { reservation, items: createdItems } = await store.createReservationHold({
      userId,
      eventId,
      items,
      idempotencyKey,
    });

    // Schedule background queue job
    reservationWorker.scheduleReservationHold(reservation.id, 10);

    const now = Date.now();
    const expiresTime = new Date(reservation.expiresAt).getTime();
    const remainingSeconds = Math.max(0, Math.floor((expiresTime - now) / 1000));

    return res.status(201).json({
      message: 'Tickets reserved successfully for 10 minutes.',
      reservation: {
        ...reservation,
        remainingSeconds,
      },
      items: createdItems,
    });
  } catch (err: any) {
    console.error('Reservation error:', err.message);
    const statusCode = err.message.includes('Insufficient') || err.message.includes('sales have ended') ? 409 : 400;
    return res.status(statusCode).json({ error: err.message || 'Failed to create reservation hold.' });
  }
});

// GET /api/reservations/:id - Check reservation status and remaining hold countdown
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = store.get();
    const reservation = db.reservations.find((r) => r.id === id);

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    // Ensure attendee can only view their own reservation (unless Admin)
    if (reservation.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Check expiration in real-time
    const now = Date.now();
    const expiresTime = new Date(reservation.expiresAt).getTime();

    if (reservation.status === 'PENDING' && expiresTime <= now) {
      // Transition to EXPIRED and release inventory
      await store.releaseReservationHold(id, 'EXPIRED');
      reservation.status = 'EXPIRED';
    }

    const remainingSeconds = reservation.status === 'PENDING' ? Math.max(0, Math.floor((expiresTime - now) / 1000)) : 0;
    const items = db.reservationItems.filter((i) => i.reservationId === id);

    const enrichedItems = items.map((item) => {
      const tier = db.ticketTiers.find((t) => t.id === item.ticketTierId);
      return {
        ...item,
        tierName: tier ? tier.name : 'Unknown Tier',
      };
    });

    const event = db.events.find((e) => e.id === reservation.eventId);

    return res.json({
      reservation: {
        ...reservation,
        remainingSeconds,
        isExpired: reservation.status === 'EXPIRED' || (reservation.status === 'PENDING' && remainingSeconds === 0),
      },
      event: event ? { id: event.id, title: event.title, bannerUrl: event.bannerUrl, venue: event.venue, eventDate: event.eventDate } : null,
      items: enrichedItems,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/reservations/:id/cancel - Attendee voluntarily cancels hold
router.post('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = store.get();
    const reservation = db.reservations.find((r) => r.id === id);

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    if (reservation.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    if (reservation.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot cancel reservation in ${reservation.status} state.` });
    }

    await store.releaseReservationHold(id, 'CANCELLED', req.user!.id);

    return res.json({ message: 'Reservation cancelled and held tickets released.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export const reservationRoutes = router;
