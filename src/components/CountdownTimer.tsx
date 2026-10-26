import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: string; // Server ISO timestamp
  onExpire?: () => void;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiresAt, onExpire, className = '' }) => {
  const calculateRemaining = () => {
    const target = new Date(expiresAt).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((target - now) / 1000));
    return diff;
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number>(calculateRemaining);
  const [expiredFired, setExpiredFired] = useState<boolean>(false);

  useEffect(() => {
    // Initial check
    const remaining = calculateRemaining();
    setRemainingSeconds(remaining);
    if (remaining <= 0 && !expiredFired) {
      setExpiredFired(true);
      onExpire?.();
    }

    const interval = setInterval(() => {
      const sec = calculateRemaining();
      setRemainingSeconds(sec);
      if (sec <= 0) {
        clearInterval(interval);
        if (!expiredFired) {
          setExpiredFired(true);
          onExpire?.();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, expiredFired, onExpire]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isLowTime = remainingSeconds > 0 && remainingSeconds <= 120; // under 2 minutes
  const isExpired = remainingSeconds === 0;

  if (isExpired) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm font-semibold animate-pulse ${className}`}>
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <span>Reservation hold expired (00:00)</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
        isLowTime
          ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
          : 'bg-violet-50 text-violet-900 border-violet-200'
      } ${className}`}
    >
      <Clock className={`w-4 h-4 ${isLowTime ? 'text-amber-600 animate-spin' : 'text-violet-600'}`} />
      <span>
        Reservation expires in <span className="font-mono tracking-wider font-bold">{formattedTime}</span>
      </span>
    </div>
  );
};
