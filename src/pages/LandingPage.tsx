import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { EventItem } from '../types';
import {
  Search,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Tag,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  { name: 'Tech & Innovation', count: '40+ events', icon: '💻', color: 'from-blue-500/10 to-indigo-500/10' },
  { name: 'Music & Arts', count: '25+ events', icon: '🎵', color: 'from-purple-500/10 to-pink-500/10' },
  { name: 'Food & Wine', count: '18+ events', icon: '🍷', color: 'from-amber-500/10 to-orange-500/10' },
  { name: 'Business & Leadership', count: '30+ events', icon: '📈', color: 'from-emerald-500/10 to-teal-500/10' },
  { name: 'Fitness & Sports', count: '15+ events', icon: '🏃', color: 'from-red-500/10 to-rose-500/10' },
];

export const LandingPage: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get('/events');
        setEvents(res.data.events || []);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/explore?search=${encodeURIComponent(searchQuery)}`);
  };

  const featuredEvents = events.slice(0, 3);
  const upcomingEvents = events.slice(3, 7);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-violet-600/30 to-blue-500/20 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute -bottom-10 left-10 w-72 h-72 bg-indigo-500/20 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-400/20 text-violet-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Multi-Tenant High-Concurrency Ticketing Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Discover Unforgettable Events. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-blue-400">
              Reserve with Zero Double-Booking.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            EventSphere powers premier conferences, festivals, and summits with a concurrency-safe 10-minute hold reservation engine and isolated organizer workspaces.
          </p>

          {/* Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-2xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row items-center gap-2 border border-slate-200/50 text-slate-900"
          >
            <div className="flex-1 flex items-center gap-2 px-3 w-full">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by event title, city, or topic..."
                className="w-full text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden py-2"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm shadow-md shadow-violet-600/30 transition flex items-center justify-center gap-2"
            >
              <span>Explore Events</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Metrics */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
              <p className="text-2xl font-bold text-white">10 Min</p>
              <p className="text-xs text-slate-400">Atomic Hold Guarantee</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
              <p className="text-2xl font-bold text-violet-400">100%</p>
              <p className="text-xs text-slate-400">Concurrency Protected</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
              <p className="text-2xl font-bold text-indigo-400">Multi-Tenant</p>
              <p className="text-xs text-slate-400">Isolated Organizers</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
              <p className="text-2xl font-bold text-emerald-400">&lt; 50ms</p>
              <p className="text-xs text-slate-400">Redis Cached Latency</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-600 fill-violet-600" />
              Featured Experiences
            </h2>
            <p className="text-xs text-slate-500">Curated high-demand events available for immediate reservation</p>
          </div>
          <Link
            to="/explore"
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 group"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-white animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
              <div
                key={event.id}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img
                    src={event.bannerUrl}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                    {event.category}
                  </div>
                  {event.availableTickets !== undefined && (
                    <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
                      {event.availableTickets > 0 ? `${event.availableTickets} tickets left` : 'Sold Out'}
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-violet-600" />
                      <span>{new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>&bull;</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{event.startTime}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base group-hover:text-violet-600 transition line-clamp-1">
                      {event.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Starting from</span>
                      <span className="text-lg font-bold text-slate-900">
                        ${event.minPrice ? event.minPrice.toFixed(0) : '0'}
                      </span>
                    </div>

                    <Link
                      to={`/events/${event.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white transition group-hover:bg-violet-600 group-hover:text-white"
                    >
                      Reserve Tickets
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">Explore by Category</h2>
        <p className="text-xs text-slate-500 mb-6">Find events tailored to your passions and industry</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => navigate(`/explore?category=${encodeURIComponent(cat.name)}`)}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-violet-300 hover:shadow-md transition text-left group"
            >
              <div className="text-2xl mb-2">{cat.icon}</div>
              <h4 className="font-bold text-slate-800 text-xs group-hover:text-violet-600 transition">
                {cat.name}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{cat.count}</p>
            </button>
          ))}
        </div>
      </section>

      {/* How It Works (Section 4 Flow) */}
      <section id="how-it-works" className="bg-white py-16 border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
              Fail-Safe Reservation Engine
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">How EventSphere Guarantees Your Seat</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Unlike legacy systems that risk overselling, our database transaction locks guarantee your inventory for a strict 10-minute checkout window.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-violet-600 text-white font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base">Select Ticket Tier</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose from VIP, Premium, or General Admission passes. Real-time availability checks ensure no requested tier is sold out.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-violet-200 space-y-3 relative shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base">Atomic 10-Minute Hold</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                PostgreSQL row locks instantly hold inventory. A server-synchronized live countdown timer gives you 10 minutes to complete checkout with zero double-booking risk.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base">Simulated Checkout & Pass</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complete checkout via mock payment gateway. Instant QR-code ticket passes and confirmation receipts are immediately issued and downloadable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Organizer Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-950 text-white p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-400 bg-violet-400/10 px-3 py-1 rounded-full border border-violet-400/20">
              For Event Organizers
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Host Your Next Sold-Out Event with EventSphere
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Create multi-tier ticketing, track revenue in real-time with Recharts analytics, prevent overselling with row locks, and export attendee booking reports.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link
              to="/register"
              className="px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-xs text-white text-center shadow-lg shadow-violet-600/30 transition"
            >
              Start Hosting Free
            </Link>
            <Link
              to="/organizer"
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-xs text-white text-center border border-white/20 transition"
            >
              Organizer Demo Tour
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
