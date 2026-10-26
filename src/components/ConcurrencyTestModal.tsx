import React, { useState } from 'react';
import api from '../services/api';
import { Zap, CheckCircle2, XCircle, AlertCircle, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface ConcurrencyTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConcurrencyTestModal: React.FC<ConcurrencyTestModalProps> = ({ isOpen, onClose }) => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunTest = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await api.post('/tests/concurrency');
      setResult(res.data.result);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Concurrency test encountered an error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Live Concurrency Benchmark</h3>
              <p className="text-xs text-slate-300">Automated 20-Request Contention Test (Section 13)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-violet-600" />
              Test Scenario Parameters:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>Target:</strong> Special benchmark tier with exactly <strong>10 available tickets</strong></li>
              <li><strong>Load:</strong> 20 concurrent attendees attempt to reserve 1 ticket simultaneously via <code>Promise.all()</code></li>
              <li><strong>Assertion 1:</strong> Exactly 10 reservations must succeed</li>
              <li><strong>Assertion 2:</strong> Exactly 10 reservations must fail with <code>INSUFFICIENT_INVENTORY</code></li>
              <li><strong>Assertion 3:</strong> Remaining available inventory must equal exactly <code>0</code> (never negative)</li>
              <li><strong>Assertion 4:</strong> Database row locks prevent double-booking race conditions</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className={`p-4 rounded-xl border ${result.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                {result.passed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-900">
                      Concurrency Assertion Passed: 100% Concurrency Safe
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-bold text-red-900">Test Failed Assertions</span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Requests</p>
                  <p className="text-lg font-bold text-slate-800">20</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-emerald-700">
                  <p className="text-[10px] uppercase font-semibold">Succeeded</p>
                  <p className="text-lg font-bold">{result.successCount} / 10</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-amber-700">
                  <p className="text-[10px] uppercase font-semibold">Rejected (409)</p>
                  <p className="text-lg font-bold">{result.failureCount} / 10</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Available Qty</p>
                  <p className="text-lg font-bold text-slate-900">{result.finalTier.availableQuantity}</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 mt-3">
                Atomic database row locking (<code>SELECT FOR UPDATE</code> simulation) guaranteed that no two threads took the same ticket and available inventory stopped strictly at 0.
              </p>
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Close
            </button>
            <button
              onClick={handleRunTest}
              disabled={running}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-500/25 transition disabled:opacity-50"
            >
              {running ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Firing 20 Simultaneous Requests...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white" />
                  Execute Concurrency Test
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
