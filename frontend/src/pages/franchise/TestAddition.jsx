import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import TestDualListPicker from '../../components/TestDualListPicker';
import { api } from '../../services/api';
import { sanitizeBarcodeScannedValue } from '../../utils/barcodeScan';

export default function TestAddition() {
  const [barcode, setBarcode] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [registration, setRegistration] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [selectedExtra, setSelectedExtra] = useState([]);
  const [testSearch, setTestSearch] = useState('');
  const [selectedTestSearch, setSelectedTestSearch] = useState('');

  useEffect(() => {
    api.getTests()
      .then((rows) => setCatalog(Array.isArray(rows) ? rows : []))
      .catch(() => setCatalog([]));
  }, []);

  const existingTestIds = useMemo(
    () => new Set(
      (registration?.tests || [])
        .map((row) => (typeof row.test === 'object' ? row.test?.id : row.test) || row.test_id)
        .filter(Boolean),
    ),
    [registration],
  );

  const availableTests = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    return catalog.filter((test) => {
      if (existingTestIds.has(test.id)) return false;
      if (selectedExtra.some((item) => item.id === test.id)) return false;
      if (!q) return true;
      return (
        test.name?.toLowerCase().includes(q)
        || test.short_name?.toLowerCase().includes(q)
        || test.test_code?.toLowerCase().includes(q)
      );
    });
  }, [catalog, existingTestIds, selectedExtra, testSearch]);

  const runSearch = useCallback(async (raw = barcode) => {
    const cleaned = sanitizeBarcodeScannedValue(raw);
    if (!cleaned) {
      setError('Enter a barcode to search.');
      setRegistration(null);
      return;
    }

    setBarcode(cleaned);
    setSearching(true);
    setError('');
    setMessage('');
    setSelectedExtra([]);
    setRegistration(null);

    try {
      const lookup = await api.lookupPatientBarcode(cleaned);
      if (!lookup?.found || !lookup.lab_code) {
        const rows = await api.searchRegistrations({ barcode: cleaned });
        const match = Array.isArray(rows) ? rows[0] : null;
        if (!match?.lab_code) {
          setError(lookup?.message || 'No registration found for this barcode.');
          return;
        }
        const detail = await api.getRegistration(match.lab_code);
        setRegistration(detail);
        setMessage(`Loaded booking ${detail.lab_code}.`);
        return;
      }
      const detail = await api.getRegistration(lookup.lab_code);
      setRegistration(detail);
      setMessage(`Loaded booking ${detail.lab_code}.`);
    } catch (err) {
      setError(err.message || 'Barcode search failed.');
    } finally {
      setSearching(false);
    }
  }, [barcode]);

  const handleSave = async () => {
    if (!registration?.lab_code) {
      setError('Search a barcode first.');
      return;
    }
    if (!selectedExtra.length) {
      setError('Select at least one test to add.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await api.addRegistrationTests(
        registration.lab_code,
        selectedExtra.map((test) => test.id),
      );
      setRegistration(updated);
      setSelectedExtra([]);
      setMessage(`Added tests to ${updated.lab_code}.`);
    } catch (err) {
      setError(err.message || 'Could not add tests.');
    } finally {
      setSaving(false);
    }
  };

  const patient = registration?.patient;

  return (
    <Layout activePage="manage-booking">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li><Link to="/franchise/manage-booking/list">Entry Section</Link></li>
              <li>Test Addition</li>
            </ul>
          </nav>
          <h2 className="page-heading">Test Addition</h2>
          <p className="portfolio-intro">Search by barcode, then add extra tests to the existing booking.</p>
        </header>

        <section className="franchise-module-panel test-addition-search" aria-label="Search barcode">
          <label className="test-addition-search-label" htmlFor="test-addition-barcode">
            Search Barcode
          </label>
          <div className="test-addition-search-row">
            <input
              id="test-addition-barcode"
              type="text"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  runSearch(event.currentTarget.value);
                }
              }}
              placeholder="Scan or type barcode"
              autoComplete="off"
            />
            <button
              type="button"
              className="btn-primary test-addition-search-btn"
              onClick={() => runSearch()}
              disabled={searching}
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>
        </section>

        {error && <p className="login-error" role="alert">{error}</p>}
        {message && <p className="form-success-msg">{message}</p>}

        {registration && (
          <section className="franchise-module-panel" aria-label="Booking details">
            <div className="test-addition-summary">
              <div><span>Lab Code</span><strong>{registration.lab_code}</strong></div>
              <div><span>Patient</span><strong>{patient?.patient_name || registration.patient_name}</strong></div>
              <div><span>Patient ID</span><strong>{patient?.patient_id || '—'}</strong></div>
              <div><span>Doctor</span><strong>{patient?.doctor_name || '—'}</strong></div>
              <div><span>Status</span><strong>{registration.status}</strong></div>
            </div>

            <h3 className="test-addition-subtitle">Current tests</h3>
            <ul className="test-addition-current-list">
              {(registration.tests || []).length === 0 && <li>No tests on this booking yet.</li>}
              {(registration.tests || []).map((row) => (
                <li key={row.id || (typeof row.test === 'object' ? row.test?.id : row.test)}>
                  {(typeof row.test === 'object' ? row.test?.name : null) || row.test_name || 'Test'}
                </li>
              ))}
            </ul>

            <h3 className="test-addition-subtitle">Add tests</h3>
            <TestDualListPicker
              available={availableTests}
              selected={selectedExtra}
              onAdd={(items) => setSelectedExtra((prev) => [...prev, ...items])}
              onRemove={(ids) => setSelectedExtra((prev) => prev.filter((test) => !ids.includes(test.id)))}
              onRemoveAll={() => setSelectedExtra([])}
              testSearch={testSearch}
              onTestSearchChange={setTestSearch}
              selectedTestSearch={selectedTestSearch}
              onSelectedTestSearchChange={setSelectedTestSearch}
            />

            <div className="test-addition-actions">
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Add Selected Tests'}
              </button>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </Layout>
  );
}
