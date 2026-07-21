import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyResponsiveTables } from '../utils/tableResponsive';

export function useResponsiveTables() {
  const location = useLocation();

  useEffect(() => {
    const run = () => applyResponsiveTables(document);

    run();

    const root = document.getElementById('root');
    if (!root) return undefined;

    let timer;
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, 120);
    });

    observer.observe(root, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [location.pathname]);
}
