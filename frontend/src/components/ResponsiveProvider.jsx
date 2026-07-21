import { useResponsiveTables } from '../hooks/useResponsiveTables';

export default function ResponsiveProvider({ children }) {
  useResponsiveTables();
  return children;
}
