import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  Printer,
  Download,
  Share2,
  QrCode,
  Ticket,
  ChevronRight,
} from 'lucide-react';

export const ConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/orders/${orderId}`);
        setOrder(res.data.order);
      } catch (err) {
        console.error('Failed to load order confirmation:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadICS = () => {
    if (!order?.event) return;
    const evt = order.event;
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventSphere//Ticketing//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${evt.title}`,
      `DESCRIPTION:Booking Reference: ${order.bookingReference}\\nVenue: ${evt.venue}`,
      `LOCATION:${evt.venue}, ${evt.address}`,
      `DTSTART:${new Date(evt.eventDate).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${new Date(new Date(evt.eventDate).getTime() + 4 * 3600000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${evt.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyRef = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.bookingReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Retrieving confirmed tickets...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md space-y-4">
          <p className="text-sm font-bold text-slate-800">Booking record not found</p>
          <Link to="/explore" className="text-xs text-violet-600 font-semibold hover:underline">
            Return to Explore Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Success Banner */}
        <div className="text-center space-y-3 print:hidden">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Booking Confirmed!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Your payment was processed successfully and ticket inventory is confirmed in your name.
          </p>

          {/* Booking Reference Pill */}
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500">Booking Ref:</span>
            <span className="font-mono font-bold text-xs text-slate-900">{order.bookingReference}</span>
            <button
              onClick={handleCopyRef}
              className="text-[11px] font-semibold text-violet-600 hover:text-violet-700 ml-1"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Digital Ticket Pass Card (Printable) */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl print:shadow-none print:border-none">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest uppercase bg-violet-500/30 text-violet-200 px-2.5 py-0.5 rounded">
                Official Event Pass
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {order.event?.title || 'Confirmed Event Booking'}
              </h2>
              <p className="text-xs text-slate-300">{order.organization?.name || 'EventSphere Organizer'}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <Ticket className="w-6 h-6 -rotate-12" />
            </div>
          </div>

          {/* Ticket Details Body */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-slate-100">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Date</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {order.event?.eventDate
                    ? new Date(order.event.eventDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Time</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {order.event?.startTime || '18:00'}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Attendee</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{order.attendeeName}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Paid</p>
                <p className="text-xs font-bold text-emerald-600 mt-0.5">${order.totalAmount.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-400">Venue & Address</p>
              <div className="flex items-start gap-2 text-xs text-slate-700">
                <MapPin className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">{order.event?.venue}</p>
                  <p className="text-slate-500">{order.event?.address}</p>
                </div>
              </div>
            </div>

            {/* Ticket Passes list */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase font-bold text-slate-400">Ticket Items</p>
              <div className="space-y-2">
                {order.items?.map((it: any) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{it.tierName}</span>
                      <span className="text-slate-400 ml-2">&times; {it.quantity}</span>
                    </div>
                    <span className="font-semibold text-slate-900">
                      ${(it.quantity * Number(it.unitPrice)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code & Barcode Section */}
            <div className="pt-6 border-t border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/50 p-4 rounded-2xl">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs font-bold text-slate-900">Digital Gate Verification</p>
                <p className="text-[11px] text-slate-500">
                  Present this QR code or booking reference at the venue check-in desk.
                </p>
                <p className="text-[10px] font-mono text-slate-400">Ref: {order.bookingReference}</p>
              </div>

              {/* Mock QR Code Graphic */}
              <div className="w-24 h-24 bg-white p-2 rounded-xl border border-slate-300 shadow-xs flex flex-col items-center justify-center shrink-0">
                <QrCode className="w-16 h-16 text-slate-900" />
                <span className="text-[8px] font-mono font-bold text-slate-500 mt-0.5">SCAN ME</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Ticket Pass</span>
            </button>
            <button
              onClick={handleDownloadICS}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Add to Calendar (.ics)</span>
            </button>
          </div>

          <Link
            to="/attendee"
            className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-bold text-white shadow-xs transition"
          >
            <span>View All My Bookings</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
