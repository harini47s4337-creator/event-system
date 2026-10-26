import { store } from '../db/store.js';

export class AnalyticsService {
  /**
   * Get comprehensive organizer analytics scoped to organization
   */
  public static getOrganizerOverview(organizationId: string) {
    const db = store.get();

    // Filter events belonging to organization
    const orgEvents = db.events.filter((e) => e.organizationId === organizationId);
    const orgEventIds = new Set(orgEvents.map((e) => e.id));

    // Filter ticket tiers
    const tiers = db.ticketTiers.filter((t) => orgEventIds.has(t.eventId));

    const totalEvents = orgEvents.length;
    const publishedEvents = orgEvents.filter((e) => e.status === 'PUBLISHED').length;

    let totalCapacity = 0;
    let totalTicketsSold = 0;
    let totalRemainingInventory = 0;
    let totalReserved = 0;

    for (const t of tiers) {
      totalCapacity += t.totalQuantity;
      totalTicketsSold += t.soldQuantity;
      totalRemainingInventory += t.availableQuantity;
      totalReserved += t.reservedQuantity;
    }

    // Filter orders and reservations
    const orgOrders = db.orders.filter((o) => orgEventIds.has(o.eventId) && o.status === 'CONFIRMED');
    const totalConfirmedBookings = orgOrders.length;
    const totalRevenue = orgOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const orgReservations = db.reservations.filter((r) => orgEventIds.has(r.eventId));
    const pendingReservations = orgReservations.filter((r) => r.status === 'PENDING').length;
    const eligibleBookingAttempts = orgReservations.length; // Denominator: total valid holds created

    const conversionRate =
      eligibleBookingAttempts > 0
        ? Number(((totalConfirmedBookings / eligibleBookingAttempts) * 100).toFixed(1))
        : 0;

    // Daily revenue and booking trends (last 7 days or sample dates)
    const dailyMap = new Map<string, { date: string; revenue: number; bookings: number; tickets: number }>();

    // Generate recent 7 days keys
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap.set(key, { date: key, revenue: 0, bookings: 0, tickets: 0 });
    }

    for (const o of orgOrders) {
      const d = new Date(o.createdAt);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dailyMap.has(key)) {
        const item = dailyMap.get(key)!;
        item.revenue += Number(o.totalAmount);
        item.bookings += 1;
        const items = db.orderItems.filter((oi) => oi.orderId === o.id);
        item.tickets += items.reduce((s, it) => s + it.quantity, 0);
      }
    }

    const revenueOverTime = Array.from(dailyMap.values());

    // Tickets sold by category/tier
    const tierMap = new Map<string, { name: string; sold: number; available: number; revenue: number }>();
    for (const t of tiers) {
      const existing = tierMap.get(t.name) || { name: t.name, sold: 0, available: 0, revenue: 0 };
      existing.sold += t.soldQuantity;
      existing.available += t.availableQuantity;
      existing.revenue += t.soldQuantity * Number(t.price);
      tierMap.set(t.name, existing);
    }
    const ticketsByCategory = Array.from(tierMap.values());

    // Event-wise comparison
    const eventComparison = orgEvents.map((evt) => {
      const evtTiers = tiers.filter((t) => t.eventId === evt.id);
      const evtOrders = orgOrders.filter((o) => o.eventId === evt.id);
      const revenue = evtOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
      const sold = evtTiers.reduce((s, t) => s + t.soldQuantity, 0);
      const capacity = evt.capacity || evtTiers.reduce((s, t) => s + t.totalQuantity, 0);
      return {
        eventId: evt.id,
        title: evt.title,
        status: evt.status,
        revenue,
        ticketsSold: sold,
        capacity,
        occupancyRate: capacity > 0 ? Math.round((sold / capacity) * 100) : 0,
      };
    });

    // Funnel metrics
    const totalHolds = orgReservations.length;
    const expiredHolds = orgReservations.filter((r) => r.status === 'EXPIRED').length;
    const paymentFailed = orgReservations.filter((r) => r.status === 'PAYMENT_FAILED').length;
    const conversionFunnel = [
      { stage: 'Reservation Holds Created', count: totalHolds },
      { stage: 'Payment Initiated', count: totalHolds - expiredHolds },
      { stage: 'Confirmed Bookings', count: totalConfirmedBookings },
    ];

    return {
      kpi: {
        totalEvents,
        publishedEvents,
        totalCapacity,
        totalTicketsSold,
        remainingInventory: totalRemainingInventory,
        pendingReservations,
        totalConfirmedBookings,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        conversionRate,
        eligibleBookingAttempts,
      },
      revenueOverTime,
      ticketsByCategory,
      eventComparison,
      conversionFunnel,
      recentBookings: orgOrders.slice(-5).reverse().map((o) => ({
        id: o.id,
        bookingReference: o.bookingReference,
        attendeeName: o.attendeeName,
        attendeeEmail: o.attendeeEmail,
        amount: o.totalAmount,
        createdAt: o.createdAt,
      })),
    };
  }

  /**
   * Platform-wide analytics for Admin
   */
  public static getPlatformOverview() {
    const db = store.get();

    const totalUsers = db.users.length;
    const totalOrganizers = db.users.filter((u) => u.role === 'ORGANIZER').length;
    const totalAttendees = db.users.filter((u) => u.role === 'ATTENDEE').length;
    const totalOrganizations = db.organizations.length;
    const totalEvents = db.events.length;
    const publishedEvents = db.events.filter((e) => e.status === 'PUBLISHED').length;
    const pendingEvents = db.events.filter((e) => e.status === 'PENDING_APPROVAL').length;

    const totalOrders = db.orders.filter((o) => o.status === 'CONFIRMED').length;
    const totalRevenue = db.orders
      .filter((o) => o.status === 'CONFIRMED')
      .reduce((s, o) => s + Number(o.totalAmount), 0);

    const activeReservations = db.reservations.filter((r) => r.status === 'PENDING').length;

    return {
      totalUsers,
      totalOrganizers,
      totalAttendees,
      totalOrganizations,
      totalEvents,
      publishedEvents,
      pendingEvents,
      totalOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      activeReservations,
      recentTransactions: db.transactions.slice(-8).reverse(),
      recentAuditLogs: db.auditLogs.slice(-10).reverse(),
    };
  }
}
