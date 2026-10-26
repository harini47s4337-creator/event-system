import { store } from '../db/store.js';

/**
 * Reservation Expiration & Cleanup Background Worker (Section 6)
 * Simulates BullMQ delayed job processing & scheduled cron reconciliation.
 * Ensures:
 * 1. Held inventory is released if checkout is not completed within 10 minutes.
 * 2. Idempotent execution (safe to run multiple times).
 * 3. Never releases inventory twice.
 */
class ReservationWorker {
  private intervalTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private intervalMs = 5000; // Run reconciliation every 5 seconds

  public start() {
    if (this.intervalTimer) return;

    console.log('[Worker] Reservation expiration & cleanup worker started (Interval: 5s)');
    this.intervalTimer = setInterval(async () => {
      await this.runReconciliation();
    }, this.intervalMs);

    // Initial check on boot
    this.runReconciliation().catch(console.error);
  }

  public stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
      console.log('[Worker] Reservation expiration worker stopped');
    }
  }

  public async runReconciliation(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;
    try {
      const releasedCount = await store.reconcileExpiredReservations();
      if (releasedCount > 0) {
        console.log(`[Worker] Cleaned up & released ${releasedCount} expired reservation(s).`);
      }
      return releasedCount;
    } catch (err) {
      console.error('[Worker] Error during reservation reconciliation:', err);
      return 0;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Schedule delayed verification job for a newly created reservation
   */
  public scheduleReservationHold(reservationId: string, holdMinutes = 10) {
    const delayMs = holdMinutes * 60 * 1000;
    setTimeout(async () => {
      try {
        const released = await store.releaseReservationHold(reservationId, 'EXPIRED');
        if (released) {
          console.log(`[Worker] Expired reservation ${reservationId} after ${holdMinutes}min timeout`);
        }
      } catch (err) {
        console.error(`[Worker] Failed checking reservation ${reservationId}:`, err);
      }
    }, delayMs);
  }
}

export const reservationWorker = new ReservationWorker();
