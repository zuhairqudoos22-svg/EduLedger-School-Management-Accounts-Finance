import { useEffect, useRef, useState, useCallback } from 'react';
import { touchSessionActivity, getLastActivityTimestamp } from '../utils/secureSession';

export function useInactivityTimeout(
  timeoutMinutes: number = 15,
  onTimeout: () => void,
  isEnabled: boolean = true
) {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stayLoggedIn = useCallback(() => {
    touchSessionActivity();
    lastActivityRef.current = Date.now();
    setIsWarningOpen(false);
    setSecondsRemaining(60);
  }, []);

  useEffect(() => {
    if (!isEnabled || timeoutMinutes <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsWarningOpen(false);
      return;
    }

    const totalDurationMs = timeoutMinutes * 60 * 1000;
    const warningThresholdMs = Math.max(totalDurationMs - 60 * 1000, 0); // 60 seconds before timeout

    const handleUserInteraction = () => {
      const now = Date.now();
      // Throttle updating sessionStorage to once every 2 seconds
      if (now - lastActivityRef.current > 2000) {
        touchSessionActivity();
        lastActivityRef.current = now;
      }
      if (isWarningOpen) {
        // If warning is open and user interacts, extend session
        stayLoggedIn();
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(ev => window.addEventListener(ev, handleUserInteraction, { passive: true }));

    // Check every second for accurate countdown
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const lastActive = Math.max(lastActivityRef.current, getLastActivityTimestamp());
      const elapsed = now - lastActive;

      if (elapsed >= totalDurationMs) {
        // Timed out completely!
        setIsWarningOpen(false);
        onTimeout();
      } else if (elapsed >= warningThresholdMs) {
        // Show 60s warning
        const remaining = Math.max(Math.ceil((totalDurationMs - elapsed) / 1000), 0);
        setSecondsRemaining(remaining);
        setIsWarningOpen(true);
      } else {
        if (isWarningOpen) {
          setIsWarningOpen(false);
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      events.forEach(ev => window.removeEventListener(ev, handleUserInteraction));
    };
  }, [timeoutMinutes, onTimeout, isEnabled, isWarningOpen, stayLoggedIn]);

  return {
    isWarningOpen,
    secondsRemaining,
    stayLoggedIn,
  };
}
