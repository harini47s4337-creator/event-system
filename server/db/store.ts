import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSchema, TicketTier, Reservation, Order, Transaction, User, Organization, Event, AuditLog } from './types.js';
import { getSeedData } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'eventsphere_db.json');

// Async Mutex for atomic transactions (simulating PostgreSQL SERIALIZABLE / SELECT FOR UPDATE)
class Mutex {
  private queue: Array<(release: () => void) => void> = [];
  private locked = false;

  public async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const execute = () => {
        this.locked = true;
        resolve(() => {
          this.locked = false;
          if (this.queue.length > 0) {
            const next = this.queue.shift()!;
            next(this.release.bind(this));
          }
        });
      };

      if (!this.locked) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  private release() {
    this.locked = false;
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next(this.release.bind(this));
    }
  }
}

class Store {
  private db!: DatabaseSchema;
  private mutex = new Mutex();
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.db = JSON.parse(raw);
      } catch (err) {
        console.error('Failed reading DB file, reseeding:', err);
        this.db = getSeedData();
        this.persist();
      }
    } else {
      this.db = getSeedData();
      this.persist();
    }

    this.initialized = true;
  }

  private persist() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database to file:', err);
    }
  }

  // Transaction wrapper with full row isolation & atomic commit
  public async transaction<T>(callback: (db: DatabaseSchema) => Promise<T>): Promise<T> {
    const release = await this.mutex.acquire();
    try {
      const result = await callback(this.db);
      this.persist();
      return result;
    } finally {
      release();
    }
  }

  // Direct read accessor (safe snapshot)
  public get(): DatabaseSchema {
    this.init();
    return this.db;
  }

  // --- Core Concurrency-Safe Operations ---

  /**
   * Concurrency-safe ticket reservation hold (10 minutes)
   * Equivalent to:
   * BEGIN;
   * SELECT * FROM ticket_tiers WHERE id = ? FOR UPDATE;
   * IF available_quantity < requested THEN ROLLBACK;
   * UPDATE ticket_tiers SET available_quantity = available_quantity - ?, reserved_quantity = reserved_quantity + ?;
   * INSERT INTO reservations (...);
   * COMMIT;
   */
  public async createReservationHold(params: {
    userId: string;
    eventId: string;
    items: Array<{ ticketTierId: string; quantity: number }>;
    idempotencyKey?: string;
  }): Promise<{ reservation: Reservation; items: any[] }> {
    return this.transaction(async (db) => {
      const { userId, eventId, items, idempotencyKey } = params;

      // 1. Idempotency Check
      if (idempotencyKey) {
        const existing = db.reservations.find(
          (r) => r.idempotencyKey === idempotencyKey && r.userId === userId
        );
        if (existing) {
          const existingItems = db.reservationItems.filter((i) => i.reservationId === existing.id);
          return { reservation: existing, items: existingItems };
        }
      }

      // 2. Validate Event
      const event = db.events.find((e) => e.id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }
      if (event.status !== 'PUBLISHED') {
        throw new Error(`Event is not open for booking (status: ${event.status})`);
      }

      // Check sales cut-off
      const now = new Date();
      if (new Date(event.salesCutoffAt) < now) {
        throw new Error('Ticket sales for this event have ended');
      }
      if (new Date(event.salesStartAt) > now) {
        throw new Error('Ticket sales have not started yet');
      }

      // 3. Row-level Lock & Inventory Availability Check
      let totalAmount = 0;
      const validatedItems: Array<{ tier: TicketTier; quantity: number; unitPrice: number }> = [];

      for (const item of items) {
        if (!item.quantity || item.quantity <= 0) {
          throw new Error('Invalid ticket quantity specified');
        }

        const tier = db.ticketTiers.find((t) => t.id === item.ticketTierId && t.eventId === eventId);
        if (!tier) {
          throw new Error(`Ticket tier ${item.ticketTierId} not found for this event`);
        }

        if (tier.availableQuantity < item.quantity) {
          throw new Error(
            `Insufficient tickets available for "${tier.name}". Requested: ${item.quantity}, Available: ${tier.availableQuantity}`
          );
        }

        totalAmount += Number(tier.price) * item.quantity;
        validatedItems.push({
          tier,
          quantity: item.quantity,
          unitPrice: Number(tier.price),
        });
      }

      // 4. Atomic Inventory Decrement
      for (const v of validatedItems) {
        v.tier.availableQuantity -= v.quantity;
        v.tier.reservedQuantity += v.quantity;
        v.tier.updatedAt = now.toISOString();
      }

      // 5. Create 10-Minute Reservation Hold
      const reservationId = 'res-' + Math.random().toString(36).substring(2, 10);
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // exactly 10 minutes

      const newReservation: Reservation = {
        id: reservationId,
        userId,
        eventId,
        status: 'PENDING',
        expiresAt,
        idempotencyKey,
        totalAmount: Number(totalAmount.toFixed(2)),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      db.reservations.push(newReservation);

      const createdItems = validatedItems.map((v) => {
        const rItem = {
          id: 'ritem-' + Math.random().toString(36).substring(2, 10),
          reservationId,
          ticketTierId: v.tier.id,
          quantity: v.quantity,
          unitPrice: v.unitPrice,
        };
        db.reservationItems.push(rItem);
        return rItem;
      });

      // Audit Log
      db.auditLogs.push({
        id: 'aud-' + Math.random().toString(36).substring(2, 10),
        userId,
        action: 'TICKET_HOLD_CREATED',
        resourceType: 'RESERVATION',
        resourceId: reservationId,
        details: `Held ${items.reduce((s, i) => s + i.quantity, 0)} tickets for 10 minutes. Expires: ${expiresAt}`,
        createdAt: now.toISOString(),
      });

      return { reservation: newReservation, items: createdItems };
    });
  }

  /**
   * Release reservation hold (when user cancels, payment fails, or 10 min expires)
   */
  public async releaseReservationHold(
    reservationId: string,
    reason: 'EXPIRED' | 'CANCELLED' | 'PAYMENT_FAILED',
    userId?: string
  ): Promise<boolean> {
    return this.transaction(async (db) => {
      const reservation = db.reservations.find((r) => r.id === reservationId);
      if (!reservation) {
        return false;
      }

      // Can only release if currently PENDING
      if (reservation.status !== 'PENDING') {
        return false;
      }

      const items = db.reservationItems.filter((i) => i.reservationId === reservationId);
      const now = new Date().toISOString();

      // Return inventory
      for (const item of items) {
        const tier = db.ticketTiers.find((t) => t.id === item.ticketTierId);
        if (tier) {
          tier.reservedQuantity = Math.max(0, tier.reservedQuantity - item.quantity);
          tier.availableQuantity += item.quantity;
          tier.updatedAt = now;
        }
      }

      reservation.status = reason;
      reservation.updatedAt = now;

      db.auditLogs.push({
        id: 'aud-' + Math.random().toString(36).substring(2, 10),
        userId: userId || reservation.userId,
        action: `RESERVATION_RELEASED_${reason}`,
        resourceType: 'RESERVATION',
        resourceId: reservationId,
        details: `Released inventory back to pool. Reason: ${reason}`,
        createdAt: now,
      });

      return true;
    });
  }

  /**
   * Confirm booking from successful payment
   * Converts reserved hold into confirmed booking (soldQuantity += quantity, reservedQuantity -= quantity)
   */
  public async confirmReservationAndCreateOrder(params: {
    reservationId: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone?: string;
    paymentReference: string;
    idempotencyKey?: string;
  }): Promise<{ order: Order; transaction: Transaction }> {
    return this.transaction(async (db) => {
      const { reservationId, attendeeName, attendeeEmail, attendeePhone, paymentReference, idempotencyKey } = params;

      const reservation = db.reservations.find((r) => r.id === reservationId);
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      // Idempotency check on order
      if (idempotencyKey) {
        const existingTxn = db.transactions.find((t) => t.idempotencyKey === idempotencyKey);
        if (existingTxn && existingTxn.orderId) {
          const existingOrder = db.orders.find((o) => o.id === existingTxn.orderId);
          if (existingOrder) {
            return { order: existingOrder, transaction: existingTxn };
          }
        }
      }

      // Check existing order for this reservation
      const existingOrder = db.orders.find((o) => o.reservationId === reservationId);
      if (existingOrder) {
        const txn = db.transactions.find((t) => t.orderId === existingOrder.id);
        return { order: existingOrder, transaction: txn! };
      }

      // Verify reservation is still valid
      if (reservation.status !== 'PENDING') {
        throw new Error(`Cannot confirm reservation with status: ${reservation.status}`);
      }

      const now = new Date();
      if (new Date(reservation.expiresAt) <= now) {
        // Expired hold cannot be converted
        this.releaseReservationHold(reservationId, 'EXPIRED');
        throw new Error('Reservation hold has expired. Inventory was released.');
      }

      const items = db.reservationItems.filter((i) => i.reservationId === reservationId);
      const isoNow = now.toISOString();

      // Move held tickets to sold
      for (const item of items) {
        const tier = db.ticketTiers.find((t) => t.id === item.ticketTierId);
        if (tier) {
          tier.reservedQuantity = Math.max(0, tier.reservedQuantity - item.quantity);
          tier.soldQuantity += item.quantity;
          tier.updatedAt = isoNow;
        }
      }

      // Update reservation status
      reservation.status = 'CONFIRMED';
      reservation.updatedAt = isoNow;

      // Create Order
      const orderId = 'ord-' + Math.random().toString(36).substring(2, 10);
      const bookingReference = 'ESP-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);

      const order: Order = {
        id: orderId,
        userId: reservation.userId,
        eventId: reservation.eventId,
        reservationId,
        bookingReference,
        attendeeName,
        attendeeEmail,
        attendeePhone,
        totalAmount: reservation.totalAmount,
        status: 'CONFIRMED',
        createdAt: isoNow,
        updatedAt: isoNow,
      };
      db.orders.push(order);

      for (const item of items) {
        db.orderItems.push({
          id: 'oitem-' + Math.random().toString(36).substring(2, 10),
          orderId,
          ticketTierId: item.ticketTierId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      }

      // Create Transaction
      const transaction: Transaction = {
        id: 'txn-' + Math.random().toString(36).substring(2, 10),
        orderId,
        reservationId,
        paymentReference,
        amount: reservation.totalAmount,
        paymentMethod: 'MOCK_PAYMENT_GATEWAY',
        status: 'SUCCESS',
        idempotencyKey,
        createdAt: isoNow,
        updatedAt: isoNow,
      };
      db.transactions.push(transaction);

      // Notification
      db.notifications.push({
        id: 'notif-' + Math.random().toString(36).substring(2, 10),
        userId: reservation.userId,
        title: 'Booking Confirmed!',
        message: `Your booking ${bookingReference} has been confirmed. See your ticket passes in My Bookings.`,
        read: false,
        createdAt: isoNow,
      });

      // Audit Log
      db.auditLogs.push({
        id: 'aud-' + Math.random().toString(36).substring(2, 10),
        userId: reservation.userId,
        action: 'ORDER_CONFIRMED',
        resourceType: 'ORDER',
        resourceId: orderId,
        details: `Order ${bookingReference} confirmed. Total: $${reservation.totalAmount}`,
        createdAt: isoNow,
      });

      return { order, transaction };
    });
  }

  /**
   * Periodic reconciliation job: scans and releases any expired pending reservations
   */
  public async reconcileExpiredReservations(): Promise<number> {
    return this.transaction(async (db) => {
      const now = new Date();
      const expiredPending = db.reservations.filter(
        (r) => r.status === 'PENDING' && new Date(r.expiresAt) <= now
      );

      if (expiredPending.length === 0) return 0;

      let releasedCount = 0;
      const isoNow = now.toISOString();

      for (const res of expiredPending) {
        const items = db.reservationItems.filter((i) => i.reservationId === res.id);
        for (const item of items) {
          const tier = db.ticketTiers.find((t) => t.id === item.ticketTierId);
          if (tier) {
            tier.reservedQuantity = Math.max(0, tier.reservedQuantity - item.quantity);
            tier.availableQuantity += item.quantity;
            tier.updatedAt = isoNow;
          }
        }
        res.status = 'EXPIRED';
        res.updatedAt = isoNow;
        releasedCount++;

        db.auditLogs.push({
          id: 'aud-' + Math.random().toString(36).substring(2, 10),
          userId: res.userId,
          action: 'BACKGROUND_WORKER_EXPIRATION',
          resourceType: 'RESERVATION',
          resourceId: res.id,
          details: 'Hold expired without payment. Inventory restored.',
          createdAt: isoNow,
        });
      }

      return releasedCount;
    });
  }
}

export const store = new Store();
