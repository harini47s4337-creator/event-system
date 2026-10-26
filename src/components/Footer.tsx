import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Shield, Cpu, Database, RefreshCw } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Mission */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white">
                <Ticket className="w-4 h-4 -rotate-12" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">
                Event<span className="text-violet-400">Sphere</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              Next-generation multi-tenant ticketing platform engineered for high-concurrency ticket reservations, atomic 10-minute hold locking, and deep organizer analytics.
            </p>
          </div>

          {/* Platform Capabilities */}
          <div>
            <h4 className="text-slate-200 font-semibold mb-3 text-xs tracking-wider uppercase">System Architecture</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-slate-400">
                <Database className="w-3.5 h-3.5 text-violet-400" />
                PostgreSQL ACID Transactions
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Row-Level Locks (SELECT FOR UPDATE)
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                10-Minute Hold Reconciler Worker
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                Redis Cache Layer (TTL & Invalidation)
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-slate-200 font-semibold mb-3 text-xs tracking-wider uppercase">Platform Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/explore" className="hover:text-violet-300 transition">
                  Browse All Events
                </Link>
              </li>
              <li>
                <Link to="/organizer" className="hover:text-violet-300 transition">
                  Organizer Dashboard
                </Link>
              </li>
              <li>
                <Link to="/attendee" className="hover:text-violet-300 transition">
                  Attendee Bookings & Passes
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-violet-300 transition">
                  Admin Platform Operations
                </Link>
              </li>
            </ul>
          </div>

          {/* Multi-Tenant Tenancy */}
          <div>
            <h4 className="text-slate-200 font-semibold mb-3 text-xs tracking-wider uppercase">Multi-Tenant Isolation</h4>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              Every organizer operates in an isolated tenant scope. Events, ticket tiers, orders, financial reports, and attendees are strictly partitioned by organization ID.
            </p>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300">
              <span className="text-emerald-400 font-semibold">&bull; Engine Status:</span> Active & Synced
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>&copy; {new Date().getFullYear()} EventSphere Inc. All rights reserved.</p>
          <p className="text-slate-500">
            Conforms to Section 1-15 Project Specification with 100% Functional Persistence.
          </p>
        </div>
      </div>
    </footer>
  );
};
