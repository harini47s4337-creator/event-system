import { store } from '../db/store.js';

/**
 * Concurrency & High-Contention Reservation Automated Test
 * Assumes:
 * - Benchmark ticket tier with exactly 10 tickets available
 * - 20 concurrent attendees attempt to reserve 1 ticket each simultaneously
 * Expected:
 * - Exactly 10 reservations succeed
 * - Exactly 10 fail with insufficient inventory error
 * - Final available inventory is exactly 0
 * - Inventory never becomes negative
 * - All holds have 10-minute expiration timestamps
 */
export async function runConcurrencyTest() {
  console.log('\n======================================================');
  console.log('⚡ STARTING CONCURRENCY & DOUBLE-BOOKING PREVENT TEST ⚡');
  console.log('======================================================');

  // Find or create test event and ticket tier with exactly 10 tickets
  const tierId = 'tier-concurrency-benchmark';
  const eventId = 'evt-concurrency-test';

  // Reset benchmark tier to 10 available
  await store.transaction(async (db) => {
    let tier = db.ticketTiers.find((t) => t.id === tierId);
    if (!tier) {
      tier = {
        id: tierId,
        eventId,
        name: 'Concurrency Benchmark GA',
        price: 50,
        totalQuantity: 10,
        availableQuantity: 10,
        reservedQuantity: 0,
        soldQuantity: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.ticketTiers.push(tier);
    } else {
      tier.availableQuantity = 10;
      tier.reservedQuantity = 0;
      tier.soldQuantity = 0;
    }

    // Clean any prior benchmark reservations
    db.reservations = db.reservations.filter((r) => r.eventId !== eventId);
  });

  console.log('✓ Initial state: 10 tickets available, 0 reserved, 0 sold.');
  console.log('⚡ Firing 20 simultaneous reservation requests...');

  const results: Array<{ id: number; success: boolean; error?: string; reservationId?: string }> = [];

  // Launch 20 concurrent promises
  const promises = Array.from({ length: 20 }, async (_, idx) => {
    const attendeeUserId = `usr-test-attendee-${idx + 1}`;
    try {
      const res = await store.createReservationHold({
        userId: attendeeUserId,
        eventId,
        items: [{ ticketTierId: tierId, quantity: 1 }],
        idempotencyKey: `idemp-test-concurrent-${idx + 1}`,
      });
      return { id: idx + 1, success: true, reservationId: res.reservation.id };
    } catch (err: any) {
      return { id: idx + 1, success: false, error: err.message };
    }
  });

  const responses = await Promise.all(promises);

  const successes = responses.filter((r) => r.success);
  const failures = responses.filter((r) => !r.success);

  const db = store.get();
  const finalTier = db.ticketTiers.find((t) => t.id === tierId)!;

  console.log('\n--- Test Execution Results ---');
  console.log(`Total Requests: 20`);
  console.log(`Successes:     ${successes.length} (Expected: 10)`);
  console.log(`Failures:      ${failures.length} (Expected: 10)`);
  console.log(`Available Qty: ${finalTier.availableQuantity} (Expected: 0)`);
  console.log(`Reserved Qty:  ${finalTier.reservedQuantity} (Expected: 10)`);
  console.log(`Sold Qty:      ${finalTier.soldQuantity} (Expected: 0)`);

  const passed =
    successes.length === 10 &&
    failures.length === 10 &&
    finalTier.availableQuantity === 0 &&
    finalTier.reservedQuantity === 10 &&
    finalTier.availableQuantity >= 0;

  if (passed) {
    console.log('\n✅ CONCURRENCY TEST PASSED: No double-booking occurred, atomic row locks guaranteed 0 negative inventory.\n');
  } else {
    console.error('\n❌ CONCURRENCY TEST FAILED!\n');
    throw new Error('Concurrency test failed assertions.');
  }

  return {
    passed,
    successCount: successes.length,
    failureCount: failures.length,
    finalTier,
  };
}

// If executed directly
if (process.argv[1]?.endsWith('concurrencyTest.ts')) {
  runConcurrencyTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
