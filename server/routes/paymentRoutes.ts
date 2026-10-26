import { Router } from 'express';
import { mockPaymentGateway, PaymentSimulationMode } from '../services/paymentGateway.js';
import { store } from '../db/store.js';
import { authenticate, AuthenticatedRequest } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/payments/initiate - Initiate payment intent
router.post('/initiate', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { reservationId, simulationMode = 'SUCCESS', idempotencyKey } = req.body;

    if (!reservationId) {
      return res.status(400).json({ error: 'reservationId is required.' });
    }

    const db = store.get();
    const reservation = db.reservations.find((r) => r.id === reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    if (reservation.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const intent = await mockPaymentGateway.initiatePayment({
      reservationId,
      amount: reservation.totalAmount,
      simulationMode: simulationMode as PaymentSimulationMode,
      idempotencyKey,
    });

    return res.status(201).json({
      message: 'Payment session initiated.',
      paymentIntent: intent,
    });
  } catch (err: any) {
    console.error('Payment initiation error:', err);
    return res.status(400).json({ error: err.message || 'Failed to initiate payment.' });
  }
});

// GET /api/payments/:id/status - Check payment intent status
router.get('/:id/status', authenticate, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const intent = mockPaymentGateway.getPaymentStatus(id);

  if (!intent) {
    return res.status(404).json({ error: 'Payment record not found.' });
  }

  return res.json({ payment: intent });
});

// POST /api/payments/process - Simulate payment execution (Supports test modes: SUCCESS, FAILURE, TIMEOUT)
router.post('/process', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { paymentId, mode = 'SUCCESS', attendeeName, attendeeEmail, attendeePhone, idempotencyKey } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required.' });
    }

    const result = await mockPaymentGateway.processPayment(
      paymentId,
      mode as PaymentSimulationMode,
      {
        name: attendeeName || req.user!.name,
        email: attendeeEmail || req.user!.email,
        phone: attendeePhone,
        idempotencyKey,
      }
    );

    if (result.status === 'FAILED') {
      return res.status(402).json({
        error: result.errorMessage || 'Payment was declined by card issuer.',
        payment: result,
      });
    }

    if (result.status === 'TIMEOUT') {
      return res.status(504).json({
        error: result.errorMessage || 'Payment gateway timed out.',
        payment: result,
      });
    }

    // Retrieve created order
    const db = store.get();
    const order = db.orders.find((o) => o.reservationId === result.reservationId);

    return res.json({
      message: 'Payment completed successfully.',
      payment: result,
      order,
    });
  } catch (err: any) {
    console.error('Payment processing error:', err);
    return res.status(400).json({ error: err.message || 'Payment processing failed.' });
  }
});

// POST /api/payments/webhook - Asynchronous payment callback
router.post('/webhook', async (req, res) => {
  try {
    const { event, data } = req.body;

    if (!event || !data) {
      return res.status(400).json({ error: 'Invalid webhook payload.' });
    }

    console.log(`[Webhook] Received payment callback event: ${event}`);

    if (event === 'payment.succeeded') {
      const { reservationId, attendeeName, attendeeEmail, paymentReference, idempotencyKey } = data;
      await store.confirmReservationAndCreateOrder({
        reservationId,
        attendeeName: attendeeName || 'Webhook User',
        attendeeEmail: attendeeEmail || 'user@example.com',
        paymentReference: paymentReference || `WH-${Date.now()}`,
        idempotencyKey,
      });
    } else if (event === 'payment.failed') {
      const { reservationId } = data;
      await store.releaseReservationHold(reservationId, 'PAYMENT_FAILED');
    }

    return res.json({ received: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export const paymentRoutes = router;
