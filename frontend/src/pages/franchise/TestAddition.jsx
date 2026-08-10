import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import TestDualListPicker from '../../components/TestDualListPicker';
import { api } from '../../services/api';
import { sanitizeBarcodeScannedValue } from '../../utils/barcodeScan';
import { resolveFranchiseBooking } from './resolveBooking';

function formatRegistrationTime(registration) {
  const raw = registration?.registration_date || registration?.created_at;
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TestAddition() {
  const [searchParams] = useSearchParams();
  const [barcode, setBarcode] = useState(searchParams.get('barcode') || '');
  const [labCode, setLabCode] = useState(searchParams.get('labCode') || '');
  const [patientId, setPatientId] = useState(searchParams.get('patientId') || '');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [registration, setRegistration] = useState(null);
  const [linkedBarcodes, setLinkedBarcodes] = useState([]);
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

  const loadLinkedBarcodes = useCallback(async (detail) => {
    if (!detail?.lab_code && !detail?.patient?.patient_id) {
      setLinkedBarcodes([]);
      return;
    }
    try {
      const params = {};
      if (detail.lab_code) params.lab_code = detail.lab_code;
      else if (detail.patient?.patient_id) params.patient_id = detail.patient.patient_id;
      const rows = await api.getPatientBarcodes(params);
      setLinkedBarcodes(Array.isArray(rows) ? rows : []);
    } catch {
      setLinkedBarcodes([]);
    }
  }, []);

  const runSearch = useCallback(async (overrides = {}) => {
    const nextBarcode = sanitizeBarcodeScannedValue(overrides.barcode ?? barcode);
    const nextLabCode = String(overrides.labCode ?? labCode).trim();
    const nextPatientId = String(overrides.patientId ?? patientId).trim();

    if (!nextBarcode && !nextLabCode && !nextPatientId) {
      setError('Enter any one: barcode, Lab Code, or Patient ID.');
      setRegistration(null);
      return;
    }

    setBarcode(nextBarcode);
    setLabCode(nextLabCode);
    setPatientId(nextPatientId);
    setSearching(true);
    setError('');
    setMessage('');
    setSelectedExtra([]);
    setRegistration(null);
    setLinkedBarcodes([]);

    try {
      const detail = await resolveFranchiseBooking({
        barcode: nextBarcode,
        bookId: nextLabCode,
        patientId: nextPatientId,
      });
      setRegistration(detail);
      await loadLinkedBarcodes(detail);
      setMessage(
        `Loaded booking ${detail.lab_code} for patient ${detail.patient?.patient_id || detail.patient_name}. `
        + 'You can add more tests to this same entry.',
      );
    } catch (err) {
      setError(err.message || 'Could not find this booking.');
    } finally {
      setSearching(false);
    }
  }, [barcode, labCode, patientId, loadLinkedBarcodes]);

  useEffect(() => {
    const fromUrl = searchParams.get('barcode') || searchParams.get('labCode') || searchParams.get('patientId');
    if (fromUrl) {
      runSearch({
        barcode: searchParams.get('barcode') || '',
        labCode: searchParams.get('labCode') || '',
        patientId: searchParams.get('patientId') || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!registration?.lab_code) {
      setError('Search and load a booking first.');
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
      await loadLinkedBarcodes(updated);
      setSelectedExtra([]);
      setMessage(
        `Added ${selectedExtra.length} test(s) to ${updated.lab_code}. `
        + 'Same Patient ID and Lab Code — billing will include the new test.',
      );
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
          <p className="portfolio-intro">
            After New Entry, open this page later (even after 1–2 hours) and search the same patient
            by barcode, Lab Code, or Patient ID to add more tests on the same booking.
          </p>
        </header>

        <section className="franchise-module-panel test-addition-search" aria-label="Find booking">
          <p className="test-addition-search-label">Find existing booking</p>
          <div className="test-addition-search-grid">
            <label>
              <span>Sample barcode</span>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="Scan any linked sample barcode"
                autoComplete="off"
              />
            </label>
            <label>
              <span>Lab Code</span>
              <input
                type="text"
                value={labCode}
                onChange={(e) => setLabCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="Book / Lab code"
                autoComplete="off"
              />
            </label>
            <label>
              <span>Patient ID</span>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="Patient ID from registration"
                autoComplete="off"
              />
            </label>
          </div>
          <div className="test-addition-search-row">
            <button
              type="button"
              className="btn-primary test-addition-search-btn"
              onClick={() => runSearch()}
              disabled={searching}
            >
              {searching ? 'Searching…' : 'Find booking'}
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
              <div><span>Registered</span><strong>{formatRegistrationTime(registration)}</strong></div>
              <div><span>Doctor</span><strong>{patient?.doctor_name || '—'}</strong></div>
              <div><span>Status</span><strong>{registration.status}</strong></div>
            </div>

            {linkedBarcodes.length > 0 && (
              <>
                <h3 className="test-addition-subtitle">Linked barcodes</h3>
                <ul className="test-addition-current-list">
                  {linkedBarcodes.map((row) => (
                    <li key={row.id || row.barcode}>
                      {row.barcode}
                      {row.sample_type ? ` — ${row.sample_type}` : ''}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3 className="test-addition-subtitle">Current tests on this booking</h3>
            <ul className="test-addition-current-list">
              {(registration.tests || []).length === 0 && <li>No tests on this booking yet.</li>}
              {(registration.tests || []).map((row) => (
                <li key={row.id || (typeof row.test === 'object' ? row.test?.id : row.test)}>
                  {(typeof row.test === 'object' ? row.test?.name : null) || row.test_name || 'Test'}
                </li>
              ))}
            </ul>

            <h3 className="test-addition-subtitle">Add more tests</h3>
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
                {saving ? 'Saving…' : 'Add selected tests to this booking'}
              </button>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </Layout>
  );
}
