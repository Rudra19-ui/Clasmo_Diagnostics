import { useEffect, useState } from 'react';
import { formatDateTime } from '../utils/date';

/** Live date/time string from the user's system clock (DD-MM-YYYY HH:MM:SS). */
export function useSystemDateTime(intervalMs = 1000) {
  const [dateTime, setDateTime] = useState(() => formatDateTime(new Date()));

  useEffect(() => {
    const tick = () => setDateTime(formatDateTime(new Date()));
    tick();
    const timerId = setInterval(tick, intervalMs);
    return () => clearInterval(timerId);
  }, [intervalMs]);

  return dateTime;
}
