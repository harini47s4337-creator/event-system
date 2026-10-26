import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Calendar,
  Ticket,
  DollarSign,
  TrendingUp,
  Clock,
  Plus,
  Edit,
  Trash2,
  FileSpreadsheet,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Building,
  Users,
  Shield,
  X,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const OrganizerDashboard: React.FC = () => {
  const { user, organization } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'bookings' | 'announcements'>('overview');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Create Event Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createCategory, setCreateCategory] = useState('Tech & Innovation');
  const [createVenue, setCreateVenue] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createDate, setCreateDate] = useState('2026-11-20');
  const [createStartTime, setCreateStartTime] = useState('09:00');
  const [createEndTime, setCreateEndTime] = useState('17:00');
  const [createCapacity, setCreateCapacity] = useState('200');
  const [createDesc, setCreateDesc] = useState('');
  const [createTiers, setCreateTiers] = useState([
    { name: 'General Admission', price: '75', totalQuantity: '150' },
    { name: 'VIP Pass', price: '199', totalQuantity: '50' },
  ]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Add Announcement Modal State
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [announceEventId, setAnnounceEventId] = useState('');
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceContent, setAnnounceContent] = useState('');
  const [announcePinned, setAnnouncePinned] = useState(true);

  // Add Ticket Tier Modal State
  const [isAddTierModalOpen, setIsAddTierModalOpen] = useState(false);
  const [tierEventId, setTierEventId] = useState('');
  const [tierName, setTierName] = useState('');
  const [tierPrice, setTierPrice] = useState('');
  const [tierQuantity, setTierQuantity] = useState('');

  const fetchOrganizerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, eventsRes, bookingsRes] = await Promise.all([
        api.get('/organizer/analytics/overview'),
        api.get('/organizer/events'),
        api.get('/organizer/bookings'),
      ]);
      setAnalytics(analyticsRes.data);
      setEvents(eventsRes.data.events || []);
      setBookings(bookingsRes.data.bookings || []);
      if (eventsRes.data.events?.length > 0 && !announceEventId) {
        setAnnounceEventId(eventsRes.data.events[0].id);
        setTierEventId(eventsRes.data.events[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch organizer data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
      navigate('/explore');
      return;
    }
    fetchOrganizerData();
  }, [user]);

  const handleTogglePublish = async (eventId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await api.patch(`/organizer/events/${eventId}/publish`, { status: nextStatus });
      fetchOrganizerData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update event publication status.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    try {
      await api.delete(`/organizer/events/${eventId}`);
      fetchOrganizerData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Cannot delete event.');
    }
  };

  const handleExportCSV = () => {
    window.location.href = '/api/organizer/export/bookings';
  };

  const handleAddTierRow = () => {
    setCreateTiers([...createTiers, { name: '', price: '', totalQuantity: '' }]);
  };

  const handleRemoveTierRow = (idx: number) => {
    setCreateTiers(createTiers.filter((_, i) => i !== idx));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const cap = Number(createCapacity);
    const sumTiers = createTiers.reduce((s, t) => s + Number(t.totalQuantity || 0), 0);
    if (sumTiers > cap) {
      setModalError(`Total tier tickets (${sumTiers}) cannot exceed event capacity (${cap}).`);
      return;
    }

    setModalSubmitting(true);
    try {
      await api.post('/organizer/events', {
        title: createTitle,
        category: createCategory,
        venue: createVenue,
        address: createAddress || createVenue,
        eventDate: createDate,
        startTime: createStartTime,
        endTime: createEndTime,
        capacity: cap,
        description: createDesc,
        initialTiers: createTiers.map((t) => ({
          name: t.name,
          price: Number(t.price),
          totalQuantity: Number(t.totalQuantity),
        })),
      });

      setIsCreateModalOpen(false);
      // Reset form
      setCreateTitle('');
      setCreateDesc('');
      setCreateVenue('');
      fetchOrganizerData();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to create event.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceEventId || !announceTitle || !announceContent) return;
    try {
      await api.post(`/organizer/events/${announceEventId}/announcements`, {
        title: announceTitle,
        content: announceContent,
        isPinned: announcePinned,
      });
      setIsAnnounceModalOpen(false);
      setAnnounceTitle('');
      setAnnounceContent('');
      alert('Announcement posted successfully.');
      fetchOrganizerData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to post announcement.');
    }
  };

  const handleAddTierToEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierEventId || !tierName || !tierPrice || !tierQuantity) return;
    try {
      await api.post(`/organizer/events/${tierEventId}/tickets`, {
        name: tierName,
        price: Number(tierPrice),
        totalQuantity: Number(tierQuantity),
      });
      setIsAddTierModalOpen(false);
      setTierName('');
      setTierPrice('');
      setTierQuantity('');
      alert('Ticket tier added successfully.');
      fetchOrganizerData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add tier.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header / Tenant Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-violet-100 text-violet-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Building className="w-3 h-3 text-violet-600" />
                {organization ? organization.name : 'Organizer Workspace'}
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded">
                Tenant: {organization?.slug || user?.id}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Organizer Operations & Analytics
            </h1>
            <p className="text-xs text-slate-500">
              Multi-tenant isolated workspace. Manage ticket inventory, live holds, and conversion metrics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOrganizerData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-xs transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'overview'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'events'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            My Events ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'bookings'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Attendee Bookings ({bookings.length})
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === 'overview' && analytics && (
          <div className="space-y-6">
            {/* KPI Metrics Cards (Section 8) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold">Total Revenue</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900">
                  ${analytics.kpi.totalRevenue.toLocaleString()}
                </p>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                  Confirmed order transactions
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold">Tickets Sold</span>
                  <Ticket className="w-4 h-4 text-violet-600" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900">
                  {analytics.kpi.totalTicketsSold}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    / {analytics.kpi.totalCapacity}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {analytics.kpi.remainingInventory} tickets remaining
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold">Conversion Rate</span>
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-extrabold text-indigo-600">
                  {analytics.kpi.conversionRate}%
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {analytics.kpi.totalConfirmedBookings} / {analytics.kpi.eligibleBookingAttempts} attempts
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold">Pending Holds (10m)</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-extrabold text-amber-600">
                  {analytics.kpi.pendingReservations}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Active checkout sessions</p>
              </div>
            </div>

            {/* Recharts Analytics Charts (Section 8) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Revenue Over Time */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Revenue Over Time</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.revenueOverTime}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(value: any) => [`$${value}`, 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Tickets Sold by Category */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Inventory Distribution by Tier</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.ticketsByCategory}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="sold" name="Tickets Sold" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="available" name="Available" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Booking Conversion Funnel */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Booking Conversion Funnel</h3>
              <p className="text-xs text-slate-500">
                Track how many users move from atomic 10-minute inventory holds to confirmed payment.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {analytics.conversionFunnel?.map((item: any, idx: number) => (
                  <div key={item.stage} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Stage {idx + 1}
                    </span>
                    <p className="text-lg font-extrabold text-slate-900">{item.count}</p>
                    <p className="text-xs font-semibold text-slate-700">{item.stage}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY EVENTS */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Tenant Events Inventory</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddTierModalOpen(true)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs"
                >
                  + Add Ticket Tier
                </button>
                <button
                  onClick={() => setIsAnnounceModalOpen(true)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs flex items-center gap-1"
                >
                  <Megaphone className="w-3.5 h-3.5 text-amber-500" />
                  Post Announcement
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="p-4">Event Details</th>
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Sold / Capacity</th>
                      <th className="p-4">Revenue</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={evt.bannerUrl}
                              alt={evt.title}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-slate-900 line-clamp-1">{evt.title}</p>
                              <p className="text-[11px] text-slate-400">{evt.venue} &bull; {evt.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-800">
                            {new Date(evt.eventDate).toLocaleDateString()}
                          </p>
                          <p className="text-[11px] text-slate-400">{evt.startTime} - {evt.endTime}</p>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              evt.status === 'PUBLISHED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {evt.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800">
                            {evt.metrics?.ticketsSold || 0} / {evt.capacity}
                          </p>
                          <p className="text-[10px] text-slate-400">{evt.metrics?.occupancyRate || 0}% filled</p>
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          ${(evt.metrics?.revenue || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleTogglePublish(evt.id, evt.status)}
                              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                                evt.status === 'PUBLISHED'
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {evt.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(evt.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="Delete Event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ATTENDEE BOOKINGS & EXPORT */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Attendee Orders & Bookings</h2>
                <p className="text-xs text-slate-500">Only orders associated with your tenant events appear here.</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Bookings (CSV)</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="p-4">Reference</th>
                      <th className="p-4">Attendee</th>
                      <th className="p-4">Event</th>
                      <th className="p-4">Tickets</th>
                      <th className="p-4">Paid</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-mono font-bold text-slate-900">{b.bookingReference}</td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-800">{b.attendeeName}</p>
                          <p className="text-[11px] text-slate-400">{b.attendeeEmail}</p>
                        </td>
                        <td className="p-4 font-medium text-slate-800">{b.eventTitle}</td>
                        <td className="p-4">
                          {b.items?.map((it: any) => (
                            <span key={it.id} className="block text-[11px] text-slate-600">
                              {it.tierName} &times; {it.quantity}
                            </span>
                          ))}
                        </td>
                        <td className="p-4 font-bold text-emerald-600">${Number(b.totalAmount).toFixed(2)}</td>
                        <td className="p-4 text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CREATE EVENT */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create New Event</h3>
                  <p className="text-xs text-slate-500">Configure event details and ticket tiers</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. NextGen Web & Cloud Symposium"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={createCategory}
                      onChange={(e) => setCreateCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="Tech & Innovation">Tech & Innovation</option>
                      <option value="Music & Arts">Music & Arts</option>
                      <option value="Food & Wine">Food & Wine</option>
                      <option value="Business & Leadership">Business & Leadership</option>
                      <option value="Fitness & Sports">Fitness & Sports</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Total Capacity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={createCapacity}
                      onChange={(e) => setCreateCapacity(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Venue Name</label>
                    <input
                      type="text"
                      required
                      value={createVenue}
                      onChange={(e) => setCreateVenue(e.target.value)}
                      placeholder="e.g. Civic Auditorium"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={createAddress}
                      onChange={(e) => setCreateAddress(e.target.value)}
                      placeholder="e.g. 500 Market St, San Francisco"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={createDate}
                      onChange={(e) => setCreateDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={createStartTime}
                      onChange={(e) => setCreateStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={createEndTime}
                      onChange={(e) => setCreateEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    placeholder="Provide overview of speakers, schedule, and experience..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                {/* Ticket Tiers Sub-Form */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Ticket Tiers</span>
                    <button
                      type="button"
                      onClick={handleAddTierRow}
                      className="text-violet-600 font-semibold hover:underline"
                    >
                      + Add Tier
                    </button>
                  </div>

                  <div className="space-y-2">
                    {createTiers.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Tier Name (e.g. VIP)"
                          value={t.name}
                          onChange={(e) => {
                            const updated = [...createTiers];
                            updated[idx].name = e.target.value;
                            setCreateTiers(updated);
                          }}
                          className="flex-2 px-3 py-2 rounded-xl border border-slate-200"
                        />
                        <input
                          type="number"
                          placeholder="Price ($)"
                          value={t.price}
                          onChange={(e) => {
                            const updated = [...createTiers];
                            updated[idx].price = e.target.value;
                            setCreateTiers(updated);
                          }}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          value={t.totalQuantity}
                          onChange={(e) => {
                            const updated = [...createTiers];
                            updated[idx].totalQuantity = e.target.value;
                            setCreateTiers(updated);
                          }}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200"
                        />
                        {createTiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTierRow(idx)}
                            className="p-2 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold"
                  >
                    {modalSubmitting ? 'Creating Event...' : 'Create Event (Draft)'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: POST ANNOUNCEMENT */}
        {isAnnounceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Post Announcement to Attendees</h3>
              <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Event</label>
                  <select
                    value={announceEventId}
                    onChange={(e) => setAnnounceEventId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  >
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={announceTitle}
                    onChange={(e) => setAnnounceTitle(e.target.value)}
                    placeholder="e.g. Parking instructions"
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Content</label>
                  <textarea
                    rows={3}
                    required
                    value={announceContent}
                    onChange={(e) => setAnnounceContent(e.target.value)}
                    placeholder="Details for attendees..."
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pinned"
                    checked={announcePinned}
                    onChange={(e) => setAnnouncePinned(e.target.checked)}
                  />
                  <label htmlFor="pinned" className="text-slate-700 font-semibold">
                    Pin to top of event page
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAnnounceModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-xl bg-violet-600 text-white font-bold">
                    Publish Announcement
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD TICKET TIER */}
        {isAddTierModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Add Ticket Tier to Event</h3>
              <form onSubmit={handleAddTierToEvent} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Event</label>
                  <select
                    value={tierEventId}
                    onChange={(e) => setTierEventId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  >
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tier Name</label>
                  <input
                    type="text"
                    required
                    value={tierName}
                    onChange={(e) => setTierName(e.target.value)}
                    placeholder="e.g. VIP Backstage"
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Price ($)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={tierPrice}
                      onChange={(e) => setTierPrice(e.target.value)}
                      placeholder="120"
                      className="w-full p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={tierQuantity}
                      onChange={(e) => setTierQuantity(e.target.value)}
                      placeholder="50"
                      className="w-full p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddTierModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-xl bg-violet-600 text-white font-bold">
                    Add Tier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
