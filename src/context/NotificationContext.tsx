import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { InAppNotification, NotificationCategory, NotificationPriority, ActiveTab } from '../types';
import { useSchool } from './SchoolContext';

interface NotificationContextType {
  notifications: InAppNotification[];
  activeToasts: InAppNotification[];
  unreadCount: number;
  notify: (notification: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>) => string;
  dismissToast: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  checkImportantEvents: (force?: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'eduledger_in_app_notifications';
const SEEN_ALERTS_KEY = 'eduledger_notified_events_v1';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { books, staffAttendance, getDefaultersList, settings, setActiveTab, staff } = useSchool();

  // Load persistent notifications from localStorage
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse cached notifications:', e);
    }
    return [];
  });

  // Floating active toasts on screen
  const [activeToasts, setActiveToasts] = useState<InAppNotification[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const seenEventsRef = useRef<Set<string>>(new Set());

  // Save notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
    } catch {
      // Storage quota or private browsing
    }
  }, [notifications]);

  // Audio feedback for notifications
  const playAlertSound = useCallback((priority: NotificationPriority) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = priority === 'urgent' ? 980 : priority === 'high' ? 784 : 659.25; // E5
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio playback may require user gesture
    }
  }, []);

  // Dismiss a floating toast
  const dismissToast = useCallback((id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
    const timer = timeoutsRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timeoutsRef.current.delete(id);
    }
  }, []);

  // Dispatch a notification + toast
  const notify = useCallback(
    (item: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>): string => {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newNotification: InAppNotification = {
        ...item,
        id,
        timestamp: new Date().toISOString(),
        read: false,
        autoDismissMs: item.autoDismissMs !== undefined ? item.autoDismissMs : 6000,
      };

      setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);

      // Add to floating active toasts (keep max 4 on screen)
      setActiveToasts(prev => [newNotification, ...prev.slice(0, 3)]);

      // Audio cue
      if (item.priority === 'urgent' || item.priority === 'high') {
        playAlertSound(item.priority);
      }

      // Auto-dismiss toast timer
      if (newNotification.autoDismissMs && newNotification.autoDismissMs > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, newNotification.autoDismissMs);
        timeoutsRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast, playAlertSound]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setActiveToasts([]);
    timeoutsRef.current.forEach(timer => clearTimeout(timer));
    timeoutsRef.current.clear();
  }, []);

  // Automated Checker for Key School Events:
  // 1. Pending Fee Deadlines
  // 2. Low Inventory Levels in the Bookshop
  // 3. New Staff Attendance Records
  const checkImportantEvents = useCallback(
    (force: boolean = false) => {
      const todayDateStr = new Date().toISOString().substring(0, 10);
      const currency = settings?.currencySymbol || '$';

      // --- EVENT 1: PENDING FEE DEADLINES ---
      try {
        const defaulters = getDefaultersList();
        if (defaulters && defaulters.length > 0) {
          const totalPending = defaulters.reduce((sum, d) => sum + d.pendingAmount, 0);
          const currentDay = new Date().getDate();
          const feeDueDay = 10; // Standard institutional fee due date (10th of every month)
          const daysRemaining = feeDueDay - currentDay;

          const eventKey = `fee_deadline_${todayDateStr}_count_${defaulters.length}`;
          if (force || !seenEventsRef.current.has(eventKey)) {
            seenEventsRef.current.add(eventKey);

            let headline = `Pending Fee Deadline: ${defaulters.length} Accounts Due`;
            let message = `${defaulters.length} students have unpaid tuition dues totaling ${currency}${totalPending.toLocaleString()}.`;

            if (daysRemaining > 0 && daysRemaining <= 5) {
              headline = `Fee Payment Due in ${daysRemaining} Days`;
              message = `Tuition deadline is the ${feeDueDay}th. ${defaulters.length} accounts remain outstanding.`;
            } else if (daysRemaining <= 0) {
              headline = `Fee Payment Deadline Passed (${defaulters.length} Overdue)`;
              message = `${currency}${totalPending.toLocaleString()} is currently past due date. Follow up with student guardians.`;
            }

            notify({
              title: headline,
              message,
              category: 'fee_deadline',
              priority: daysRemaining <= 0 ? 'urgent' : 'high',
              targetTab: 'due-fees',
              actionLabel: 'View Due Fees',
              autoDismissMs: 8000,
            });
          }
        }
      } catch (err) {
        console.warn('Fee deadline event check error:', err);
      }

      // --- EVENT 2: LOW INVENTORY LEVELS IN THE BOOKSHOP ---
      try {
        if (books && books.length > 0) {
          const lowStockBooks = books.filter(b => b.stock <= (b.reorderLevel || 5));
          if (lowStockBooks.length > 0) {
            const eventKey = `low_inv_${todayDateStr}_count_${lowStockBooks.length}`;
            if (force || !seenEventsRef.current.has(eventKey)) {
              seenEventsRef.current.add(eventKey);

              const firstBook = lowStockBooks[0];
              const otherCount = lowStockBooks.length - 1;

              const title =
                lowStockBooks.length === 1
                  ? `Low Book Inventory: "${firstBook.title}"`
                  : `Low Inventory Alert: ${lowStockBooks.length} Items Running Low`;

              const message =
                lowStockBooks.length === 1
                  ? `Only ${firstBook.stock} copies remaining in stock (below threshold of ${firstBook.reorderLevel || 5}). Reorder recommended.`
                  : `"${firstBook.title}" (${firstBook.stock} left)${otherCount > 0 ? ` and ${otherCount} other textbook(s)` : ''} require restocking.`;

              notify({
                title,
                message,
                category: 'low_inventory',
                priority: 'high',
                targetTab: 'bookshop',
                actionLabel: 'Check Bookshop',
                autoDismissMs: 7000,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Bookshop inventory event check error:', err);
      }

      // --- EVENT 3: NEW STAFF ATTENDANCE RECORDS ---
      try {
        if (staffAttendance && staffAttendance.length > 0) {
          const todayRecords = staffAttendance.filter(a => a.date === todayDateStr);
          if (todayRecords.length > 0) {
            const presentCount = todayRecords.filter(a => a.status === 'present').length;
            const leaveCount = todayRecords.filter(a => a.status === 'leave').length;
            const absentCount = todayRecords.filter(a => a.status === 'absent').length;

            const eventKey = `staff_att_${todayDateStr}_records_${todayRecords.length}_pres_${presentCount}`;
            if (force || !seenEventsRef.current.has(eventKey)) {
              seenEventsRef.current.add(eventKey);

              notify({
                title: 'Staff Attendance Logged',
                message: `${todayRecords.length} faculty attendance records for today (${presentCount} Present, ${leaveCount} On Leave, ${absentCount} Absent).`,
                category: 'staff_attendance',
                priority: 'normal',
                targetTab: 'staff-attendance',
                actionLabel: 'View Roster',
                autoDismissMs: 6000,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Staff attendance event check error:', err);
      }
    },
    [getDefaultersList, settings, books, staffAttendance, notify]
  );

  // Initial event scan after data loads
  useEffect(() => {
    const timer = setTimeout(() => {
      checkImportantEvents();
    }, 1200);

    return () => clearTimeout(timer);
  }, [checkImportantEvents]);

  // Periodic background check every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkImportantEvents();
    }, 60000);

    return () => clearInterval(interval);
  }, [checkImportantEvents]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        activeToasts,
        unreadCount,
        notify,
        dismissToast,
        markAsRead,
        markAllAsRead,
        clearAll,
        checkImportantEvents,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
