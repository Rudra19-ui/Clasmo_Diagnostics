import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const NavContext = createContext(null);

function readInitialNavOpen() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(min-width: 1024px)').matches;
}

export function NavProvider({ children }) {
  const [navOpen, setNavOpen] = useState(readInitialNavOpen);
  const [openMenu, setOpenMenu] = useState(null);
  // Survives Layout remounts between routes so the sidebar does not jump to top.
  const sidebarScrollTopRef = useRef(0);

  const closeNav = useCallback(() => {
    // Desktop sidebar stays open; do not collapse open sections (that jumps scroll upward).
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      return;
    }
    setNavOpen(false);
  }, []);

  const toggleNav = useCallback(() => {
    setNavOpen((open) => !open);
  }, []);

  const rememberSidebarScroll = useCallback((top) => {
    sidebarScrollTopRef.current = Number(top) || 0;
  }, []);

  const getSidebarScroll = useCallback(() => sidebarScrollTopRef.current, []);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const syncNav = () => {
      if (media.matches) setNavOpen(true);
    };
    syncNav();
    media.addEventListener('change', syncNav);
    return () => media.removeEventListener('change', syncNav);
  }, []);

  const value = useMemo(
    () => ({
      navOpen,
      setNavOpen,
      openMenu,
      setOpenMenu,
      closeNav,
      toggleNav,
      rememberSidebarScroll,
      getSidebarScroll,
    }),
    [navOpen, openMenu, closeNav, toggleNav, rememberSidebarScroll, getSidebarScroll],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error('useNav must be used within NavProvider');
  }
  return context;
}
