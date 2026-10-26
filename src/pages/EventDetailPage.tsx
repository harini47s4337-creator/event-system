import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EventItem, TicketTier } from '../types';
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Ticket,
  AlertCircle,
  Megaphone,
  Building,
  Check,
  ChevronLeft,
  Users,
  Lock,
} from 'lucide-react';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected quantities: { [tierId: string]: number }
  const [quantities, setQuantities] = useState<{ [tierId: string]: number }>({});
  const [reserving, setReserving] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.event);
      // Initialize quantities
      const initial: { [key: string]: number } = {};
      if (res.data.event?.ticketTiers) {
        res.data.event.ticketTiers.forEach((tier: TicketTier) => {
          initial[tier.id] = 0;
        });
      }
      setQuantities(initial);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Event could not be found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const handleQuantityChange = (tierId: string, delta: number, available: number) => {
    const current = quantities[tierId] || 0;
    const next = Math.max(0, Math.min(available, current + delta));
    setQuantities((prev) => ({ ...prev, [tierId]: next }));
    setReservationError(null);
  };

  const totalTicketsSelected = Object.values(quantities).reduce((sum, q) => sum + q, 0);

  const totalAmountSelected = event?.ticketTiers
    ? event.ticketTiers.reduce((sum, tier) => {
        const qty = quantities[tier.id] || 0;
        return sum + qty * Number(tier.price);
      }, 0)
    : 0;

  const handleHoldReservation = async () => {
    if (!user) {
      navigate(`/login?redirect=/events/${id}`);
      return;
    }

    if (totalTicketsSelected <= 0) {
      setReservationError('Please select at least 1 ticket to reserve.');
      return;
    }

    setReserving(true);
    setReservationError(null);

    try {
      const items = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([ticketTierId, quantity]) => ({
          ticketTierId,
          quantity,
        }));

      // Generate client-side idempotency key for this reservation attempt
      const idempotencyKey = `idemp-hold-${user.id}-${id}-${Date.now()}`;

      const res = await api.post('/reservations', {
        eventId: id,
        items,
        idempotencyKey,
      });

      const { reservation } = res.data;
      navigate(`/checkout/${reservation.id}`);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        'Unable to hold tickets. Another attendee may have reserved the remaining inventory.';
      setReservationError(msg);
      // Re-fetch event to show updated available tickets
      fetchEvent();
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading event & live inventory...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Event Not Available</h2>
          <p className="text-xs text-slate-500">{error || 'This event may have been removed or unpublished.'}</p>
          <Link
            to="/explore"
            className="inline-block px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white"
          >
            Browse Other Events
          </Link>
        </div>
      </div>
    );
  }

  const salesClosed = new Date(event.salesCutoffAt) < new Date();
  const salesNotStarted = new Date(event.salesStartAt) > new Date();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-600 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Explore Events</span>
        </Link>

        {/* Hero Banner Card */}
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 shadow-lg text-white">
          <div className="relative h-72 sm:h-96 w-full">
            <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                {event.category}
              </span>
              {event.isSoldOut && (
                <span className="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Sold Out
                </span>
              )}
              {event.organization && (
                <span className="bg-white/20 backdrop-blur-md text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  {event.organization.name}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-300 pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-violet-400" />
                <span>
                  {new Date(event.eventDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-violet-400" />
                <span>{event.startTime} - {event.endTime}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-violet-400" />
                <span>{event.venue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Description & Announcements */}
          <div className="lg:col-span-2 space-y-6">
            {/* Announcements Card (if any) */}
            {event.announcements && event.announcements.length > 0 && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <Megaphone className="w-4 h-4 text-amber-600" />
                  <span>Organizer Notice</span>
                </div>
                {event.announcements.map((a) => (
                  <div key={a.id} className="text-xs text-amber-900 space-y-1">
                    <p className="font-bold text-sm text-amber-950">{a.title}</p>
                    <p className="leading-relaxed text-amber-800">{a.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* About Event */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-slate-900">About This Event</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>

            {/* Venue & Location */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Location & Venue</h2>
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 text-sm">{event.venue}</p>
                <p className="text-xs text-slate-500">{event.address}</p>
              </div>

              {/* Map Placeholder */}
              <div className="h-44 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                <MapPin className="w-6 h-6 text-violet-500" />
                <span className="font-medium text-slate-600">{event.venue}</span>
                <span className="text-[11px] text-slate-400">{event.address}</span>
              </div>
            </div>

            {/* Capacity Meter */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-violet-600" />
                  Venue Capacity & Allocation
                </span>
                <span className="text-slate-500">
                  Total Capacity: <span className="font-bold text-slate-900">{event.capacity} Attendees</span>
                </span>
              </div>

              {event.inventorySummary && (
                <div className="space-y-2">
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
                    <div
                      style={{
                        width: `${Math.round(
                          (event.inventorySummary.totalSold / event.capacity) * 100
                        )}%`,
                      }}
                      className="bg-emerald-500 h-full"
                      title="Sold"
                    />
                    <div
                      style={{
                        width: `${Math.round(
                          (event.inventorySummary.totalReserved / event.capacity) * 100
                        )}%`,
                      }}
                      className="bg-amber-400 h-full"
                      title="Reserved Holds"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Sold: {event.inventorySummary.totalSold}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      Active Holds: {event.inventorySummary.totalReserved}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                      Available: {event.inventorySummary.totalAvailable}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Ticket Tier Selection & 10-Minute Hold Engine */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md space-y-6 sticky top-24">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-bold text-base text-slate-900">Select Tickets</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reserved tickets are held for 10 minutes upon selection
                </p>
              </div>

              {salesClosed ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
                  <p className="font-bold">Ticket Sales Closed</p>
                  <p>Sales cutoff for this event has passed.</p>
                </div>
              ) : salesNotStarted ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 space-y-1">
                  <p className="font-bold">Sales Not Yet Open</p>
                  <p>Sales begin on {new Date(event.salesStartAt).toLocaleDateString()}.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {event.ticketTiers && event.ticketTiers.length > 0 ? (
                    event.ticketTiers.map((tier) => {
                      const qty = quantities[tier.id] || 0;
                      const isSoldOut = tier.availableQuantity <= 0;

                      return (
                        <div
                          key={tier.id}
                          className={`p-4 rounded-xl border transition ${
                            qty > 0
                              ? 'border-violet-600 bg-violet-50/30'
                              : isSoldOut
                              ? 'border-slate-200 bg-slate-50/60 opacity-60'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-bold text-xs text-slate-900">{tier.name}</h4>
                              <p className="text-[11px] text-slate-500">
                                {isSoldOut ? (
                                  <span className="text-red-500 font-semibold">Sold Out</span>
                                ) : (
                                  `${tier.availableQuantity} available`
                                )}
                              </p>
                            </div>
                            <span className="font-bold text-sm text-slate-900">${tier.price}</span>
                          </div>

                          {/* Stepper */}
                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(tier.id, -1, tier.availableQuantity)}
                              disabled={qty <= 0}
                              className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-sm"
                            >
                              -
                            </button>
                            <span className="font-bold text-xs text-slate-800 w-5 text-center">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(tier.id, 1, tier.availableQuantity)}
                              disabled={isSoldOut || qty >= tier.availableQuantity || qty >= 10}
                              className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500">No ticket tiers currently active.</p>
                  )}

                  {/* Error Notification */}
                  {reservationError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                      <span>{reservationError}</span>
                    </div>
                  )}

                  {/* Summary & Hold Trigger */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Tickets Selected:</span>
                      <span className="font-bold text-slate-800">{totalTicketsSelected}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-900">Total Price:</span>
                      <span className="font-extrabold text-base text-violet-600">
                        ${totalAmountSelected.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleHoldReservation}
                      disabled={reserving || totalTicketsSelected <= 0}
                      className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-600/25 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reserving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Acquiring Database Lock...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Hold Tickets (10 Min)</span>
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Zero double-booking guarantee via PostgreSQL lock</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
