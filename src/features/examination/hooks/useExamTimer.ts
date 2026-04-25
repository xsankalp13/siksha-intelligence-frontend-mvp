import { useState, useEffect } from 'react';
import { differenceInSeconds, parseISO, isAfter, isBefore } from 'date-fns';

interface UseExamTimerProps {
  startTime?: string;
  endTime?: string;
}

export function useExamTimer({ startTime, endTime }: UseExamTimerProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Only tick if we have valid times
    if (!startTime || !endTime) return;

    // Use a 1-second interval to compute countdown locally without API calls
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [startTime, endTime]);

  if (!startTime || !endTime) {
    return {
      display: '--:--',
      status: 'UNKNOWN',
      isEnded: false,
      isNotStarted: true,
      remainingMs: 0,
    };
  }

  const start = parseISO(startTime);
  const end = parseISO(endTime);

  const isNotStarted = isBefore(now, start);
  const isEnded = isAfter(now, end);
  
  let display = '';
  let status = '';
  let remainingMs = 0;

  if (isNotStarted) {
    status = 'NOT_STARTED';
    display = 'Not Started';
    remainingMs = end.getTime() - start.getTime(); // total duration
  } else if (isEnded) {
    status = 'ENDED';
    display = 'Ended';
    remainingMs = 0;
  } else {
    status = 'IN_PROGRESS';
    const diffSeconds = differenceInSeconds(end, now);
    remainingMs = diffSeconds * 1000;
    
    const h = Math.floor(diffSeconds / 3600);
    const m = Math.floor((diffSeconds % 3600) / 60);
    const s = diffSeconds % 60;
    
    if (h > 0) {
      display = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      display = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  }

  return {
    display,
    status,
    isEnded,
    isNotStarted,
    remainingMs,
  };
}
