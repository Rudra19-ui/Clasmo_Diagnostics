import { useEffect, useState } from 'react';
import { getBreakpoint, onBreakpointChange } from '../utils/responsive';

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState(() => getBreakpoint());

  useEffect(() => onBreakpointChange(setBreakpoint), []);

  return breakpoint;
}

export function useIsMobile() {
  const breakpoint = useBreakpoint();
  return breakpoint === 'xs' || breakpoint === 'sm';
}

export function useIsDesktop() {
  const breakpoint = useBreakpoint();
  return breakpoint === 'lg' || breakpoint === 'xl';
}
