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
  const [lastEventTime, setLastEventTime] = useState<string | undefined>(undefined);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCount = useRef(0);

  // Phase 1: Fetch historical (missed) events on mount
  const fetchHistoricalEvents = useCallback(async () => {
    try {
      const res = await dashboardService.getEvents({ size: 50 });
      setEvents(res.data.content);
      
      const unreadRes = await dashboardService.getUnreadCount();
      setUnreadCount(unreadRes.data.unreadCount);

      if (res.data.content.length > 0) {
        setLastEventTime(res.data.content[0].createdAt); // Latest event timestamp
      }
      return true;
    } catch (err) {
      console.error('Failed to fetch historical events:', err);
      // Fallback: still attempt to connect SSE even if fetch fails
      return false;
    }
  }, []);

  // Phase 2: Connect to SSE Stream
  const connectSSE = useCallback(() => {
    const token = getApiAccessToken();
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    // Append token as query parameter since EventSource doesn't support headers natively
    const url = `${baseUrl}/api/v1/auth/dashboard/events/stream?token=${token}`;

    const sse = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = sse;

    sse.onopen = () => {
      setStatus('connected');
      retryCount.current = 0;
    };

    sse.addEventListener('init', () => {
      // Connection successfully registered
    });

    sse.addEventListener('dashboard-event', (e) => {
      try {
        const newEvent: SystemEvent = JSON.parse(e.data);
        setEvents((prev) => {
          // Deduplication check
          if (prev.some((ev) => ev.id === newEvent.id)) return prev;
          return [newEvent, ...prev];
        });
        setUnreadCount((prev) => prev + 1);

        // Optional: show quick toast for critical events
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
      setStatus('reconnecting');
      
      // Exponential backoff reconnect
      const timeout = Math.min(10000, 1000 * Math.pow(2, retryCount.current));
      retryCount.current++;
      
      setTimeout(() => {
        connectSSE();
      }, timeout);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // 1. Catch up with history first
      await fetchHistoricalEvents();
      
      // 2. Then connect to live stream
      if (mounted) {
        connectSSE();
      }
    }

    init();

    return () => {
      mounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [fetchHistoricalEvents, connectSSE]);

  const markEventAsRead = async (id: string) => {
    try {
      await dashboardService.markAsRead([id]);
      setEvents((prev) =>
        prev.map((ev) => (ev.id === id ? { ...ev, isRead: true } : ev))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
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
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const clearAlerts = () => {
      // just local state clearing for now
      setEvents(prev => prev.filter(e => e.severity !== 'critical' && e.severity !== 'warning'));
  };

  return {
    events,
    unreadCount,
    status,
    markEventAsRead,
    markAllAsRead,
    clearAlerts
  };
}
