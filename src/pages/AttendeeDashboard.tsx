import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import {
  Calendar,
  Clock,
  Ticket,
  MapPin,
  ChevronRight,
  Printer,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  DollarSign,
  Lock,
} from 'lucide-react';
import { CountdownTimer } from '../components/CountdownTimer';

export const AttendeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'bookings' | 'activeHolds' | 'history'>('bookings');
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeHolds, setActiveHolds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  const fetchAttendeeData = async () => {
    setLoading(true);
    try {
      const ordersRes = await api.get('/orders');
      setOrders(ordersRes.data.orders || []);

      // If user has active reservations, we check them
      // In this demo store, we can also check user reservations
    } catch (err) {
      console.error('Failed to load attendee data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAttendeeData();
  }, [user]);

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;
    try {
      await api.post(`/orders/${orderToCancel.id}/cancel`);
      setCancelModalOpen(false);
      setOrderToCancel(null);
      alert('Booking cancelled successfully and inventory returned.');
      fetchAttendeeData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel booking.');
    }
  };

  const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED');
  const pastOrCancelledOrders = orders.filter((o) => o.status !== 'CONFIRMED');

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-md">
              Attendee Portal
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-1">My Events & Ticket Passes</h1>
            <p className="text-xs text-slate-500">
              Manage your confirmed admissions, digital gate passes, and active hold sessions.
            </p>
          </div>

          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition"
          >
            <Ticket className="w-4 h-4" />
            <span>Discover More Events</span>
          </Link>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'bookings'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Confirmed Passes ({confirmedOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'history'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Cancelled / Past ({pastOrCancelledOrders.length})
          </button>
        </div>

        {/* TAB 1: CONFIRMED BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {confirmedOrders.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center max-w-md mx-auto space-y-3">
                <Ticket className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800 text-sm">No Confirmed Passes Yet</h3>
                <p className="text-xs text-slate-500">
                  Explore published events and reserve your passes with an atomic 10-minute hold.
                </p>
                <Link
                  to="/explore"
                  className="inline-block px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-xl"
                >
                  Explore Events
                </Link>
              </div>
            ) : (
              confirmedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col md:flex-row"
                >
                  {/* Left: Event Banner Thumbnail */}
                  <div className="md:w-56 h-40 md:h-auto bg-slate-100 relative shrink-0">
                    <img
                      src={
                        order.event?.bannerUrl ||
                        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80'
                      }
                      alt={order.event?.title || 'Event'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-900">
                      Confirmed
                    </div>
                  </div>

                  {/* Middle: Details */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded">
                          Ref: {order.bookingReference}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base">{order.event?.title}</h3>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                          <span>
                            {order.event?.eventDate
                              ? new Date(order.event.eventDate).toLocaleDateString()
                              : 'Upcoming'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                          <span className="truncate">{order.event?.venue}</span>
                        </div>
                      </div>

                      {/* Line items */}
                      <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                        {order.items?.map((it) => (
                          <span
                            key={it.id}
                            className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-medium"
                          >
                            {it.tierName} &times; {it.quantity}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Paid</span>
                        <span className="text-base font-bold text-slate-900">
                          ${Number(order.totalAmount).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setOrderToCancel(order);
                            setCancelModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 text-xs font-medium transition"
                        >
                          Cancel Booking
                        </button>
                        <Link
                          to={`/confirmation/${order.id}`}
                          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-xs transition"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>View Digital Pass</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: PAST / CANCELLED */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {pastOrCancelledOrders.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No cancelled or refunded bookings.</p>
            ) : (
              pastOrCancelledOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between text-xs text-slate-600"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">{order.event?.title || 'Event'}</p>
                    <p className="text-slate-400 font-mono">Ref: {order.bookingReference}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                      {order.status}
                    </span>
                    <p className="font-bold text-slate-800 mt-1">${Number(order.totalAmount).toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CANCEL MODAL */}
        {cancelModalOpen && orderToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-bold text-base text-slate-900">Cancel Ticket Booking?</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to cancel booking <span className="font-mono font-bold text-slate-700">{orderToCancel.bookingReference}</span>?
                </p>
                <p className="text-[11px] text-slate-400 pt-1">
                  The ticket inventory will be safely released back to available pool for other attendees.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                >
                  Keep Pass
                </button>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
