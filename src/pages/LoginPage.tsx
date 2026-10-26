import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ticket, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, quickLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate(redirect);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'organizer1' | 'organizer2' | 'attendee') => {
    setLoading(true);
    setError(null);
    try {
      await quickLogin(role);
      if (role === 'admin') navigate('/admin');
      else if (role.startsWith('organizer')) navigate('/organizer');
      else navigate(redirect !== '/' ? redirect : '/attendee');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20 group-hover:scale-105 transition">
              <Ticket className="w-5 h-5 -rotate-12" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Event<span className="text-violet-600">Sphere</span>
            </span>
          </Link>
          <h1 className="text-xl font-bold text-slate-900 pt-2">Sign in to your account</h1>
          <p className="text-xs text-slate-500">Access multi-tenant dashboards, reservations & passes</p>
        </div>

        {/* 1-Click Demo Accounts Quick Picker */}
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200/80 p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-violet-900">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <span>Instant Demo Logins (1-Click)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleDemoLogin('attendee')}
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-violet-400 text-left transition shadow-2xs hover:shadow-xs"
            >
              <p className="font-bold text-slate-800">Attendee</p>
              <p className="text-[10px] text-slate-500">Book & checkout</p>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('organizer1')}
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-violet-400 text-left transition shadow-2xs hover:shadow-xs"
            >
              <p className="font-bold text-slate-800">Organizer (Pulse)</p>
              <p className="text-[10px] text-slate-500">Events & Analytics</p>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('organizer2')}
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-violet-400 text-left transition shadow-2xs hover:shadow-xs"
            >
              <p className="font-bold text-slate-800">Organizer (Horizon)</p>
              <p className="text-[10px] text-slate-500">Tenant Isolation</p>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-violet-400 text-left transition shadow-2xs hover:shadow-xs"
            >
              <p className="font-bold text-slate-800">Platform Admin</p>
              <p className="text-[10px] text-slate-500">Global Oversight</p>
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@eventsphere.com"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-violet-600 font-bold hover:underline">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
