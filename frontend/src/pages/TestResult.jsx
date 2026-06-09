import { useCallback, useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import FilterPanel from '../components/FilterPanel';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import StatusTabs from '../components/StatusTabs';
import { api } from '../services/api';
import { formatDate } from '../utils/date';

export default function TestResult() {
  const [filters, setFilters] = useState({ fromDate: formatDate(), toDate: formatDate() });
  const [activeStatus, setActiveStatus] = useState('Result Ready');
  const [rows, setRows] = useState([]);

  const loadData = useCallback(async () => {
    const data = await api.searchRegistrations({
      patient_name: filters.patientName || '',
      from_date: filters.fromDate || '',
      to_date: filters.toDate || '',
      status: activeStatus,
    });
    setRows(data);
  }, [filters, activeStatus]);

  useEffect(() => {
    loadData().catch(console.error);
  }, [loadData]);

  return (
    <Layout activePage="test-result">
      <main className="dash-main">
        <FilterPanel filters={filters} onChange={setFilters} onSearch={loadData} />
        <StatusTabs activeStatus={activeStatus} onChange={setActiveStatus} />
        <DataTable rows={rows} />
      </main>
      <Footer />
    </Layout>
  );
}
