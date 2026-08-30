import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { EXTRA_SAMPLE_ROLES } from '../utils/roles';

const ExtraSampleContext = createContext(null);

export function ExtraSampleProvider({ children }) {
  const { user } = useAuth();
  const canUseExtraSamples = EXTRA_SAMPLE_ROLES.includes(user?.role);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!canUseExtraSamples) {
      setSamples([]);
      return [];
    }
    setLoading(true);
    try {
      const data = await api.listExtraSamples();
      const rows = Array.isArray(data) ? data : [];
      setSamples(rows);
      return rows;
    } catch {
      setSamples([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [canUseExtraSamples]);

  useEffect(() => {
    refresh();
  }, [refresh, user?.id, user?.zone_id]);

  const addSample = useCallback(async (barcode) => {
    const cleaned = String(barcode || '').trim();
    if (!cleaned) {
      throw new Error('Barcode is required.');
    }
    const row = await api.createExtraSample({ barcode: cleaned });
    setSamples((prev) => {
      const without = prev.filter((item) => item.id !== row.id && item.barcode !== row.barcode);
      return [row, ...without];
    });
    return row;
  }, []);

  const removeSample = useCallback(async (sampleId) => {
    await api.removeExtraSample(sampleId);
    setSamples((prev) => prev.filter((item) => item.id !== sampleId));
  }, []);

  const value = useMemo(() => ({
    samples,
    loading,
    refresh,
    addSample,
    removeSample,
    canUseExtraSamples,
  }), [samples, loading, refresh, addSample, removeSample, canUseExtraSamples]);

  return (
    <ExtraSampleContext.Provider value={value}>
      {children}
    </ExtraSampleContext.Provider>
  );
}

export function useExtraSamples() {
  const ctx = useContext(ExtraSampleContext);
  if (!ctx) {
    throw new Error('useExtraSamples must be used within ExtraSampleProvider');
  }
  return ctx;
}

export default ExtraSampleContext;
