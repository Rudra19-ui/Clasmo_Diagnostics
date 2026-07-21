import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const NavContext = createContext(null);

export function NavProvider({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const closeNav = useCallback(() => {
    setNavOpen(false);
    setOpenMenu(null);
  }, []);

  const toggleNav = useCallback(() => {
    setNavOpen((open) => !open);
  }, []);

  const value = useMemo(
    () => ({
      navOpen,
      setNavOpen,
      openMenu,
      setOpenMenu,
      closeNav,
      toggleNav,
    }),
    [navOpen, openMenu, closeNav, toggleNav],
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
