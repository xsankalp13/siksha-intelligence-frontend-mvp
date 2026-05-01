import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardService } from '@/services/dashboard';
import type { SystemEvent } from '@/services/dashboard';
import { getApiAccessToken } from '@/lib/axios';
import { toast } from 'sonner';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export function useRealtimeEvents() {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [, setLastEventTime] = useState<string | undefined>(undefined);
  /** How many events arrived while the browser tab was hidden */
  const [missedWhileHidden, setMissedWhileHidden] = useState(0);
  /** Countdown (seconds) until next auto-reconnect attempt */
  const [retryCountdown, setRetryCountdown] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCount = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastVisibleTimestamp = useRef<string | undefined>(undefined);

  // Phase 1: Fetch historical (missed) events on mount / tab-focus refresh
  const fetchHistoricalEvents = useCallback(async (since?: string) => {
    try {
      const params = since ? { size: 50, since } : { size: 50 };
      const res = await dashboardService.getEvents(params);
      
      if (since) {
        // Tab refocus: prepend only genuinely new events
        const newItems = res.data.content;
        if (newItems.length > 0) {
          setMissedWhileHidden(newItems.length);
          setEvents((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const fresh = newItems.filter((e) => !existingIds.has(e.id));
            return [...fresh, ...prev];
          });
          setUnreadCount((prev) => prev + newItems.length);
        }
      } else {
        setEvents(res.data.content);
        const unreadRes = await dashboardService.getUnreadCount();
        setUnreadCount(unreadRes.data.unreadCount);
        if (res.data.content.length > 0) {
          setLastEventTime(res.data.content[0].createdAt);
        }
      }
      return true;
    } catch (err) {
      console.error('Failed to fetch historical events:', err);
      return false;
    }
  }, []);

  // Phase 2: Connect to SSE Stream
  const connectSSE = useCallback(() => {
    // Clear any pending retry countdown
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setRetryCountdown(0);

    const token = getApiAccessToken();
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const url = `${baseUrl}/api/v1/auth/dashboard/events/stream?token=${token}`;

    const sse = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = sse;

    sse.onopen = () => {
      setStatus('connected');
      retryCount.current = 0;
      setRetryCountdown(0);
    };

    sse.addEventListener('init', () => {
      // Connection successfully registered
    });

    sse.addEventListener('dashboard-event', (e) => {
      try {
        const newEvent: SystemEvent = JSON.parse(e.data);
        setEvents((prev) => {
          if (prev.some((ev) => ev.id === newEvent.id)) return prev;
          return [newEvent, ...prev];
        });
        setLastEventTime(newEvent.createdAt);

        // Increment unread only when tab is hidden
        if (document.visibilityState === 'hidden') {
          setMissedWhileHidden((prev) => prev + 1);
        }
        setUnreadCount((prev) => prev + 1);

        if (newEvent.severity === 'critical') {
          toast.error(`Critical Alert: ${newEvent.title}`, {
            description: newEvent.message,
          });
        }
      } catch (err) {
        console.error('Error parsing SSE event data:', err);
      }
    });

    sse.onerror = () => {
      sse.close();
      eventSourceRef.current = null;
      setStatus('reconnecting');

      // Exponential backoff capped at 30s
      const delayMs = Math.min(30_000, 1_000 * Math.pow(2, retryCount.current));
      const delaySec = Math.round(delayMs / 1000);
      retryCount.current++;

      // Show live countdown
      setRetryCountdown(delaySec);
      countdownRef.current = setInterval(() => {
        setRetryCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      retryTimerRef.current = setTimeout(() => {
        connectSSE();
      }, delayMs);
    };
  }, []);

  // Manual reconnect triggered by user
  const manualReconnect = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    retryCount.current = 0;
    setStatus('connecting');
    connectSSE();
  }, [connectSSE]);

  // Tab visibility — fetch missed events on refocus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && lastVisibleTimestamp.current) {
        fetchHistoricalEvents(lastVisibleTimestamp.current);
      } else if (document.visibilityState === 'hidden') {
        // Snapshot the latest known event time before hiding
        setLastEventTime((t) => {
          lastVisibleTimestamp.current = t;
          return t;
        });
        setMissedWhileHidden(0); // Reset — we'll count freshly when refocused
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchHistoricalEvents]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      await fetchHistoricalEvents();
      if (mounted) connectSSE();
    }

    init();

    return () => {
      mounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchHistoricalEvents, connectSSE]);

  const markEventAsRead = async (id: string) => {
    try {
      await dashboardService.markAsRead([id]);
      setEvents((prev) =>
        prev.map((ev) => (ev.id === id ? { ...ev, isRead: true } : ev))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error('Failed to mark event as read');
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = events.filter((e) => !e.isRead).map((e) => e.id);
    if (unreadIds.length === 0) return;
    try {
      await dashboardService.markAsRead(unreadIds);
      setEvents((prev) => prev.map((ev) => ({ ...ev, isRead: true })));
      setUnreadCount(0);
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const clearMissedBadge = () => setMissedWhileHidden(0);

  const clearAlerts = () => {
    setEvents((prev) => prev.filter((e) => e.severity !== 'critical' && e.severity !== 'warning'));
  };

  return {
    events,
    unreadCount,
    status,
    retryCountdown,
    missedWhileHidden,
    markEventAsRead,
    markAllAsRead,
    clearAlerts,
    clearMissedBadge,
    manualReconnect,
  };
}
