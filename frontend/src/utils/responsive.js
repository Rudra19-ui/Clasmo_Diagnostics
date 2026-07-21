export const BREAKPOINTS = {
  xs: 479,
  sm: 767,
  md: 1023,
  lg: 1280,
  xl: 1440,
};

export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.sm}px)`,
  tablet: `(min-width: ${BREAKPOINTS.sm + 1}px) and (max-width: ${BREAKPOINTS.md}px)`,
  desktop: `(min-width: ${BREAKPOINTS.md + 1}px)`,
  tabletDown: `(max-width: ${BREAKPOINTS.md}px)`,
  tabletUp: `(min-width: ${BREAKPOINTS.sm + 1}px)`,
};

export function getViewportWidth() {
  if (typeof window === 'undefined') return BREAKPOINTS.lg;
  return window.innerWidth;
}

export function getBreakpoint(width = getViewportWidth()) {
  if (width <= BREAKPOINTS.xs) return 'xs';
  if (width <= BREAKPOINTS.sm) return 'sm';
  if (width <= BREAKPOINTS.md) return 'md';
  if (width <= BREAKPOINTS.lg) return 'lg';
  return 'xl';
}

export function isMobile(width = getViewportWidth()) {
  return width <= BREAKPOINTS.sm;
}

export function isTablet(width = getViewportWidth()) {
  return width > BREAKPOINTS.sm && width <= BREAKPOINTS.md;
}

export function isDesktop(width = getViewportWidth()) {
  return width > BREAKPOINTS.md;
}

export function matchBreakpoint(query) {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(query).matches;
}

export function onBreakpointChange(callback) {
  if (typeof window === 'undefined') return () => {};

  const media = window.matchMedia(MEDIA_QUERIES.tabletDown);
  const handler = () => callback(getBreakpoint());

  handler();
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}
