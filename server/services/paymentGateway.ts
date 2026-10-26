import { store } from '../db/store.js';

export type PaymentSimulationMode = 'SUCCESS' | 'FAILURE' | 'TIMEOUT';

export interface PaymentIntent {
  paymentId: string;
  reservationId: string;
  amount: number;
  status: 'INITIATED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  simulationMode: PaymentSimulationMode;
  paymentReference: string;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

class MockPaymentGateway {
  private payments = new Map<string, PaymentIntent>();
  private defaultDelayMs = Number(process.env.PAYMENT_SIMULATION_DELAY_MS || 1200);

  /**
   * Initiate a payment session
   */
  public async initiatePayment(params: {
    reservationId: string;
    amount: number;
    simulationMode?: PaymentSimulationMode;
    idempotencyKey?: string;
  }): Promise<PaymentIntent> {
    const { reservationId, amount, simulationMode = 'SUCCESS', idempotencyKey } = params;

    // Check store for valid reservation
    const db = store.get();
    const reservation = db.reservations.find((r) => r.id === reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }
    if (reservation.status !== 'PENDING') {
      throw new Error(`Reservation is not in PENDING state (Current: ${reservation.status})`);
    }

    // Check if expired
    if (new Date(reservation.expiresAt) <= new Date()) {
      await store.releaseReservationHold(reservationId, 'EXPIRED');
      throw new Error('Reservation hold has expired. Cannot initiate payment.');
    }

    const paymentId = 'pay-' + Math.random().toString(36).substring(2, 10);
    const paymentReference = 'TXN-MOCK-' + Math.random().toString(36).substring(2, 9).toUpperCase();

    const intent: PaymentIntent = {
      paymentId,
      reservationId,
      amount,
      status: 'INITIATED',
      simulationMode,
      paymentReference,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.payments.set(paymentId, intent);
    return intent;
  }

  /**
   * Process payment asynchronously with simulated latency
   */
  public async processPayment(
    paymentId: string,
    modeOverride?: PaymentSimulationMode,
    attendeeDetails?: { name: string; email: string; phone?: string; idempotencyKey?: string }
  ): Promise<PaymentIntent> {
    const intent = this.payments.get(paymentId);
    if (!intent) {
      throw new Error('Payment intent not found');
    }

    intent.status = 'PROCESSING';
    intent.updatedAt = new Date().toISOString();

    const targetMode = modeOverride || intent.simulationMode;

    // Simulate async network/banking delay
    await new Promise((resolve) => setTimeout(resolve, this.defaultDelayMs));

    if (targetMode === 'TIMEOUT') {
      intent.status = 'TIMEOUT';
      intent.errorMessage = 'Simulated Payment Gateway Timeout: Gateway connection dropped';
      intent.updatedAt = new Date().toISOString();
      return intent;
    }

    if (targetMode === 'FAILURE') {
      intent.status = 'FAILED';
      intent.errorMessage = 'Simulated Payment Declined: Insufficient funds or card declined';
      intent.updatedAt = new Date().toISOString();

      // Automatically release reservation hold upon failed payment
      await store.releaseReservationHold(intent.reservationId, 'PAYMENT_FAILED');
      return intent;
    }

    // Success path
    intent.status = 'SUCCESS';
    intent.updatedAt = new Date().toISOString();

    if (attendeeDetails) {
      await store.confirmReservationAndCreateOrder({
        reservationId: intent.reservationId,
        attendeeName: attendeeDetails.name,
        attendeeEmail: attendeeDetails.email,
        attendeePhone: attendeeDetails.phone,
        paymentReference: intent.paymentReference,
        idempotencyKey: attendeeDetails.idempotencyKey,
      });
    }

    return intent;
  }

  /**
   * Get current payment intent status
   */
  public getPaymentStatus(paymentId: string): PaymentIntent | null {
    return this.payments.get(paymentId) || null;
  }
}

export const mockPaymentGateway = new MockPaymentGateway();
