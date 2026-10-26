import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Reservation, EventItem } from '../types';
import { CountdownTimer } from '../components/CountdownTimer';
import confetti from 'canvas-confetti';
import {
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Lock,
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [event, setEvent] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('+1 (555) 019-2834');

  // Payment Simulation State
  const [paymentMode, setPaymentMode] = useState<'SUCCESS' | 'FAILURE' | 'TIMEOUT'>('SUCCESS');
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const fetchReservation = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reservations/${reservationId}`);
      setReservation(res.data.reservation);
      setEvent(res.data.event);
      setItems(res.data.items || []);

      if (res.data.reservation.isExpired || res.data.reservation.status !== 'PENDING') {
        setExpired(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to retrieve reservation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservation();
  }, [reservationId]);

  const handleExpire = () => {
    setExpired(true);
    setPaymentError('Your 10-minute reservation hold has expired. The ticket inventory has been returned to the pool.');
  };

  const handleProcessPayment = async () => {
    if (expired) {
      setPaymentError('Cannot checkout an expired reservation.');
      return;
    }

    if (!name || !email) {
      setPaymentError('Please enter attendee name and email.');
      return;
    }

    setProcessing(true);
    setPaymentError(null);
    setProcessingStep('Initiating payment gateway session...');

    try {
      // 1. Initiate Payment Session
      const initRes = await api.post('/payments/initiate', {
        reservationId,
        simulationMode: paymentMode,
        idempotencyKey: `pay-init-${reservationId}-${Date.now()}`,
      });

      const paymentId = initRes.data.paymentIntent.paymentId;
      setProcessingStep('Connecting to simulated banking network...');

      // 2. Process with deterministic mode
      const processRes = await api.post('/payments/process', {
        paymentId,
        mode: paymentMode,
        attendeeName: name,
        attendeeEmail: email,
        attendeePhone: phone,
        idempotencyKey: `pay-proc-${paymentId}`,
      });

      setProcessingStep('Payment approved! Generating ticket pass...');

      // Confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      const order = processRes.data.order;
      setTimeout(() => {
        navigate(`/confirmation/${order.id}`);
      }, 800);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Payment simulation failed';
      setPaymentError(msg);
      // If failed, status may have updated to PAYMENT_FAILED
      fetchReservation();
    } finally {
      setProcessing(false);
      setProcessingStep('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Verifying reservation hold timestamp...</p>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Reservation Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'This hold record does not exist or has already been completed.'}</p>
          <Link
            to="/explore"
            className="inline-block px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white"
          >
            Explore Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header with Live Server Countdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-md">
              Secure Checkout
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-1">Complete Your Ticket Reservation</h1>
          </div>

          <div>
            <CountdownTimer
              expiresAt={reservation.expiresAt}
              onExpire={handleExpire}
            />
          </div>
        </div>

        {/* Expired Warning Banner */}
        {expired && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-red-950">Reservation Hold Expired</p>
              <p className="mt-0.5 text-red-700">
                The 10-minute hold window for this reservation has ended. In accordance with platform concurrency rules, these tickets were released back to available inventory.
              </p>
              <Link
                to={`/events/${reservation.eventId}`}
                className="inline-block mt-2 font-semibold text-xs text-violet-700 underline"
              >
                &larr; Return to Event to re-reserve
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Attendee Details & Payment Simulation */}
          <div className="md:col-span-2 space-y-6">
            {/* Attendee Details Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900">1. Attendee Contact Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={expired || processing}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/20"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email for Ticket Receipt</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={expired || processing}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/20"
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={expired || processing}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/20"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </div>

            {/* Mock Payment Gateway (Section 5) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-violet-600" />
                  2. Mock Payment Gateway Simulation
                </h2>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Section 5 Compliant
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                This platform uses a realistic mock payment gateway. Select the deterministic test scenario you want to evaluate:
              </p>

              {/* Simulation Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setPaymentMode('SUCCESS')}
                  disabled={expired || processing}
                  className={`p-3 rounded-xl border text-left transition ${
                    paymentMode === 'SUCCESS'
                      ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Simulate Success</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Confirms booking & converts held inventory</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('FAILURE')}
                  disabled={expired || processing}
                  className={`p-3 rounded-xl border text-left transition ${
                    paymentMode === 'FAILURE'
                      ? 'border-red-600 bg-red-50/40 ring-2 ring-red-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-red-800 mb-1">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Simulate Failed</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Declines card & returns hold to available pool</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('TIMEOUT')}
                  disabled={expired || processing}
                  className={`p-3 rounded-xl border text-left transition ${
                    paymentMode === 'TIMEOUT'
                      ? 'border-amber-600 bg-amber-50/40 ring-2 ring-amber-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800 mb-1">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Simulate Timeout</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Gateway timeout with retry capability</p>
                </button>
              </div>

              {/* Processing Spinner Banner */}
              {processing && (
                <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl flex items-center gap-3 text-xs text-violet-900 animate-pulse">
                  <RefreshCw className="w-5 h-5 text-violet-600 animate-spin" />
                  <div>
                    <p className="font-bold">Simulating Payment Gateway Transaction...</p>
                    <p className="text-violet-700 text-[11px]">{processingStep}</p>
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {paymentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{paymentError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={processing || expired}
                className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-600/25 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay ${reservation.totalAmount.toFixed(2)} & Confirm Tickets</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 sticky top-24">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
                Order Summary
              </h3>

              {event && (
                <div className="space-y-1">
                  <p className="font-bold text-xs text-slate-900">{event.title}</p>
                  <p className="text-[11px] text-slate-500">{event.venue}</p>
                  <p className="text-[11px] text-violet-600 font-medium">
                    {new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )}

              <div className="border-t border-slate-100 pt-3 space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      {it.tierName} &times; {it.quantity}
                    </span>
                    <span className="font-semibold text-slate-900">
                      ${(it.quantity * Number(it.unitPrice)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span>${reservation.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Processing Fee</span>
                  <span className="text-emerald-600 font-medium">$0.00 (Free)</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total Due</span>
                  <span className="text-base text-violet-600">${reservation.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center gap-1 text-slate-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Idempotent Transaction</span>
                </div>
                <p>Protected against duplicate clicks or double billing callbacks.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
