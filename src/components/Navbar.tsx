import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Ticket,
  Compass,
  Calendar,
  Shield,
  Layers,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Zap,
} from 'lucide-react';

interface NavbarProps {
  onOpenConcurrencyModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenConcurrencyModal }) => {
  const { user, organization, logout, quickLogin } = useAuth();
  const navigate = useNavigate();
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleQuickLogin = async (role: 'admin' | 'organizer1' | 'organizer2' | 'attendee') => {
    setDemoMenuOpen(false);
    await quickLogin(role);
    if (role === 'admin') navigate('/admin');
    else if (role.startsWith('organizer')) navigate('/organizer');
    else navigate('/attendee');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Demo Switcher Announcement Bar */}
      <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-violet-500/30 text-violet-200 border border-violet-400/30 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase">
              Multi-Tenant Demo
            </span>
            <span className="text-slate-300 hidden sm:inline">
              10-Minute Hold Engine &bull; Concurrency Protected &bull; Role-Based Access
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] hidden md:inline">Switch Demo Role:</span>
            <button
              onClick={() => handleQuickLogin('attendee')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                user?.role === 'ATTENDEE'
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              Attendee
            </button>
            <button
              onClick={() => handleQuickLogin('organizer1')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                user?.role === 'ORGANIZER'
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              Organizer (Pulse)
            </button>
            <button
              onClick={() => handleQuickLogin('admin')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                user?.role === 'ADMIN'
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              Admin
            </button>
            {onOpenConcurrencyModal && (
              <button
                onClick={onOpenConcurrencyModal}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-2.5 py-0.5 rounded text-[11px] ml-2 transition"
                title="Run automated 20-concurrent request reservation test"
              >
                <Zap className="w-3 h-3 fill-slate-950" />
                <span>Test Concurrency</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20 group-hover:scale-105 transition">
              <Ticket className="w-5 h-5 -rotate-12" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1">
                Event<span className="text-violet-600">Sphere</span>
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 -mt-1">
                Multi-Tenant Platform
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/explore" className="flex items-center gap-1.5 hover:text-violet-600 transition">
              <Compass className="w-4 h-4 text-slate-400" />
              Explore Events
            </Link>
            <Link to="/#how-it-works" className="hover:text-violet-600 transition">
              How It Works
            </Link>
            {user?.role === 'ORGANIZER' && (
              <Link to="/organizer" className="flex items-center gap-1 text-violet-600 font-semibold hover:text-violet-700">
                <Layers className="w-4 h-4" />
                Organizer Portal
              </Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link to="/admin" className="flex items-center gap-1 text-indigo-600 font-semibold hover:text-indigo-700">
                <Shield className="w-4 h-4" />
                Admin Center
              </Link>
            )}
            {user?.role === 'ATTENDEE' && (
              <Link to="/attendee" className="flex items-center gap-1 text-slate-700 hover:text-violet-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                My Bookings
              </Link>
            )}
          </nav>

          {/* Right Section / Auth Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-slate-100 transition border border-slate-200/60"
                >
                  <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-left hidden lg:block pr-1">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name.split(' ')[0]}</p>
                    <p className="text-[10px] text-violet-600 font-medium capitalize">{user.role.toLowerCase()}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 pr-1" />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      {organization && (
                        <p className="text-[10px] mt-1 bg-violet-50 text-violet-700 px-2 py-0.5 rounded font-medium inline-block">
                          {organization.name}
                        </p>
                      )}
                    </div>

                    {user.role === 'ADMIN' && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                      >
                        <Shield className="w-4 h-4 text-indigo-500" />
                        Admin Dashboard
                      </Link>
                    )}

                    {user.role === 'ORGANIZER' && (
                      <Link
                        to="/organizer"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                      >
                        <Layers className="w-4 h-4 text-violet-500" />
                        Organizer Portal
                      </Link>
                    )}

                    <Link
                      to="/attendee"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                    >
                      <Calendar className="w-4 h-4 text-slate-400" />
                      My Bookings & Holds
                    </Link>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                          navigate('/');
                        }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-slate-700 hover:text-violet-600 px-3 py-2 rounded-lg transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg shadow-xs shadow-violet-500/20 transition"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
