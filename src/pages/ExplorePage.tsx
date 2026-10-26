import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { EventItem } from '../types';
import { Search, Calendar, MapPin, Filter, ArrowUpDown, Clock, Tag } from 'lucide-react';

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || '';

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<'date' | 'price-asc' | 'price-desc'>('date');

  const categories = [
    'All Categories',
    'Tech & Innovation',
    'Music & Arts',
    'Food & Wine',
    'Business & Leadership',
    'Fitness & Sports',
  ];

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory && selectedCategory !== 'All Categories') params.category = selectedCategory;

      const res = await api.get('/events', { params });
      let list: EventItem[] = res.data.events || [];

      // Client sort
      if (sortBy === 'price-asc') {
        list.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
      } else if (sortBy === 'price-desc') {
        list.sort((a, b) => (b.minPrice || 0) - (a.minPrice || 0));
      } else {
        list.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
      }

      setEvents(list);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Explore Events</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse and reserve tickets with real-time inventory hold guarantees.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search event title, venue, speaker..."
                className="w-full text-xs text-slate-800 bg-transparent focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden"
              >
                <option value="date">Sort: Upcoming First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-xs transition"
              >
                Apply
              </button>
            </div>
          </form>

          {/* Category Quick Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-slate-400 text-[11px] font-semibold uppercase shrink-0">Tags:</span>
            {categories.map((c) => {
              const active = (c === 'All Categories' && !selectedCategory) || selectedCategory === c;
              return (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c === 'All Categories' ? '' : c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition ${
                    active
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-white rounded-2xl animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No events found</h3>
            <p className="text-xs text-slate-500">
              Try adjusting your search filters or browse other categories.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
                fetchEvents();
              }}
              className="text-xs font-semibold text-violet-600 hover:underline pt-2 inline-block"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    <img
                      src={event.bannerUrl}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-slate-800">
                      {event.category}
                    </div>
                    {event.availableTickets !== undefined && (
                      <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                        {event.availableTickets > 0 ? `${event.availableTickets} left` : 'Sold Out'}
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-violet-600" />
                      <span>{new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>&bull;</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{event.startTime}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-violet-600 transition line-clamp-1">
                      {event.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>

                    {event.organization && (
                      <p className="text-[11px] text-slate-400">
                        Hosted by <span className="font-medium text-slate-700">{event.organization.name}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">From</span>
                      <span className="text-base font-bold text-slate-900">
                        ${event.minPrice ? event.minPrice.toFixed(0) : '0'}
                      </span>
                    </div>

                    <Link
                      to={`/events/${event.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 shadow-xs transition"
                    >
                      View & Reserve
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
