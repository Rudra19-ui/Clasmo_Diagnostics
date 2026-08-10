import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BarcodeLinkForm from '../../components/BarcodeLinkForm';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import TestDualListPicker from '../../components/TestDualListPicker';
import { api } from '../../services/api';
import {
  buildSampleBarcodePayload,
  sanitizeBarcodeScannedValue,
  validateSampleBarcodes,
} from '../../utils/barcodeScan';

function formatHoursLeft(hours) {
  const value = Number(hours || 0);
  if (value <= 0) return 'Expired';
  const totalMinutes = Math.round(value * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}m left`;
  return `${h}h ${m}m left`;
}

function formatFranchiseEditTest(test) {
  const price = Number(test.price || 0);
  const mrp = Number(test.mrp || 0);
  const bits = [];
  if (price > 0) bits.push(`Price ₹${price.toFixed(2)}`);
  if (mrp > 0) bits.push(`MRP ₹${mrp.toFixed(2)}`);
  return bits.length ? `${test.name} — ${bits.join(' · ')}` : test.name;
}

function getSampleTypes(sampleType) {
  const raw = (sampleType || 'General').trim();
  const parts = raw.split(/[,/|]/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : ['General'];
}

function getFranchiseBillAmount(test) {
  const mrp = Number(test.mrp || 0);
  if (mrp > 0) return mrp;
  return Number(test.price || 0);
}

function buildSampleGroups(tests) {
  const groups = new Map();
  tests.forEach((test) => {
    getSampleTypes(test.sample_type).forEach((sampleType) => {
      if (!groups.has(sampleType)) groups.set(sampleType, []);
      groups.get(sampleType).push(test);
    });
  });
  return [...groups.entries()].map(([sampleType, groupTests]) => ({
    sampleType,
    tests: groupTests,
  }));
}

function patientFromRegistration(registration) {
  const p = registration?.patient || {};
  return {
    patient_type: p.patient_type || 'O.P.D.',
    title: p.title || 'Mr.',
    patient_name: p.patient_name || '',
    gender: p.gender || 'male',
    mobile: p.mobile || '',
    address: p.address || '',
    city: p.city || '',
    email: p.email || '',
    doctor_name: p.doctor_name || '',
    age_years: p.age_years || 0,
    age_months: p.age_months || 0,
    age_days: p.age_days || 0,
  };
}

function selectedTestsFromRegistration(registration, catalog) {
  const byId = new Map((catalog || []).map((test) => [test.id, test]));
  return (registration?.tests || []).map((row) => {
    const testId = (typeof row.test === 'object' ? row.test?.id : row.test) || row.test_id;
    const fromCatalog = byId.get(testId);
    if (fromCatalog) return fromCatalog;
    return {
      id: testId,
      name: row.test_name || (typeof row.test === 'object' ? row.test?.name : null) || 'Test',
      price: row.price,
      mrp: row.mrp,
      sample_type: row.sample_type,
    };
  }).filter((test) => test.id);
}

function testIdsFromRegistration(registration) {
  return new Set(
    (registration?.tests || [])
      .map((row) => (typeof row.test === 'object' ? row.test?.id : row.test) || row.test_id)
      .filter(Boolean),
  );
}

export default function EditEntry() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(null);
  const [patient, setPatient] = useState(null);
  const [selected, setSelected] = useState([]);
  const [originalTestIds, setOriginalTestIds] = useState(() => new Set());
  const [linkedBarcodes, setLinkedBarcodes] = useState([]);
  const [sampleBarcodes, setSampleBarcodes] = useState({});
  const [comment, setComment] = useState('');
  const [testSearch, setTestSearch] = useState('');
  const [selectedTestSearch, setSelectedTestSearch] = useState('');

  useEffect(() => {
    api.getTests()
      .then((data) => setCatalog(Array.isArray(data) ? data : []))
      .catch(() => setCatalog([]));
  }, []);

  const loadLinkedBarcodes = useCallback(async (detail) => {
    if (!detail?.lab_code && !detail?.patient?.patient_id) {
      setLinkedBarcodes([]);
      return;
    }
    try {
      const params = {};
      if (detail.lab_code) params.lab_code = detail.lab_code;
      else if (detail.patient?.patient_id) params.patient_id = detail.patient.patient_id;
      const data = await api.getPatientBarcodes(params);
      setLinkedBarcodes(Array.isArray(data) ? data : []);
    } catch {
      setLinkedBarcodes([]);
    }
  }, []);

  const loadList = useCallback(async (searchValue = '') => {
    setLoading(true);
    setError('');
    try {
      const cleaned = String(searchValue || '').trim();
      const barcode = sanitizeBarcodeScannedValue(cleaned);
      const params = { editable_only: 'true' };
      if (cleaned) {
        if (/^\d+$/.test(cleaned) || barcode.length >= 6) {
          params.barcode = barcode || cleaned;
        } else if (/^[A-Za-z]*\d+$/.test(cleaned)) {
          params.lab_code = cleaned;
        } else {
          params.patient_name = cleaned;
        }
      }
      const data = await api.searchRegistrations(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load editable entries.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList('');
  }, [loadList]);

  const availableTests = useMemo(() => {
    const chosen = new Set(selected.map((test) => test.id));
    const q = testSearch.trim().toLowerCase();
    return catalog.filter((test) => {
      if (chosen.has(test.id)) return false;
      if (!q) return true;
      return (
        test.name?.toLowerCase().includes(q)
        || test.short_name?.toLowerCase().includes(q)
        || test.test_code?.toLowerCase().includes(q)
      );
    });
  }, [catalog, selected, testSearch]);

  const newlyAddedTests = useMemo(
    () => selected.filter((test) => !originalTestIds.has(test.id)),
    [selected, originalTestIds],
  );

  const linkedSampleTypes = useMemo(() => {
    const map = new Map();
    linkedBarcodes.forEach((row) => {
      const sampleType = String(row.sample_type || '').trim();
      if (sampleType && row.is_active !== false) {
        map.set(sampleType.toLowerCase(), row.barcode);
      }
    });
    return map;
  }, [linkedBarcodes]);

  const newSampleGroups = useMemo(
    () => buildSampleGroups(newlyAddedTests),
    [newlyAddedTests],
  );

  const sampleGroupsNeedingBarcode = useMemo(
    () => newSampleGroups.filter(
      (group) => !linkedSampleTypes.has(group.sampleType.toLowerCase()),
    ),
    [newSampleGroups, linkedSampleTypes],
  );

  const sampleGroupsAlreadyLinked = useMemo(
    () => newSampleGroups.filter(
      (group) => linkedSampleTypes.has(group.sampleType.toLowerCase()),
    ),
    [newSampleGroups, linkedSampleTypes],
  );

  const openEdit = async (row) => {
    setError('');
    setMessage('');
    try {
      const detail = await api.getRegistration(row.lab_code);
      if (!detail.can_edit) {
        setError('This entry can no longer be edited (12-hour window closed).');
        setEditing(null);
        loadList();
        return;
      }
      setEditing(detail);
      setPatient(patientFromRegistration(detail));
      setSelected(selectedTestsFromRegistration(detail, catalog));
      setOriginalTestIds(testIdsFromRegistration(detail));
      setSampleBarcodes({});
      setComment(detail.comment || '');
      setTestSearch('');
      setSelectedTestSearch('');
      await loadLinkedBarcodes(detail);
    } catch (err) {
      setError(err.message || 'Could not open entry for editing.');
    }
  };

  const closeEdit = () => {
    setEditing(null);
    setPatient(null);
    setSelected([]);
    setOriginalTestIds(new Set());
    setLinkedBarcodes([]);
    setSampleBarcodes({});
    setComment('');
    setMessage('');
  };

  const updateBarcode = (sampleType, field, value) => {
    setSampleBarcodes((prev) => ({
      ...prev,
      [sampleType]: {
        enter: prev[sampleType]?.enter || '',
        confirm: prev[sampleType]?.confirm || '',
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!editing?.lab_code || !patient) return;
    if (!patient.patient_name.trim()) {
      setError('Patient name is required.');
      return;
    }
    if (!selected.length) {
      setError('Keep at least one test.');
      return;
    }

    const barcodeError = validateSampleBarcodes(sampleGroupsNeedingBarcode, sampleBarcodes);
    if (barcodeError) {
      setError(barcodeError);
      return;
    }

    const sampleBarcodePayload = buildSampleBarcodePayload(
      sampleGroupsNeedingBarcode,
      sampleBarcodes,
    );
    const addedCount = newlyAddedTests.length;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await api.updateRegistration(editing.lab_code, {
        patient: {
          patient_type: patient.patient_type,
          title: patient.title,
          patient_name: patient.patient_name.trim(),
          gender: patient.gender,
          mobile: patient.mobile,
          address: patient.address,
          city: patient.city,
          email: patient.email,
          doctor_name: patient.doctor_name,
          age_years: Number(patient.age_years) || 0,
          age_months: Number(patient.age_months) || 0,
          age_days: Number(patient.age_days) || 0,
        },
        comment,
        tests: selected.map((test) => ({
          test_id: test.id,
          price: getFranchiseBillAmount(test),
        })),
        sample_barcodes: sampleBarcodePayload,
      });
      setEditing(updated);
      setPatient(patientFromRegistration(updated));
      setSelected(selectedTestsFromRegistration(updated, catalog));
      setOriginalTestIds(testIdsFromRegistration(updated));
      setSampleBarcodes({});
      setComment(updated.comment || '');
      await loadLinkedBarcodes(updated);
      const addedNote = addedCount > 0
        ? ` Added ${addedCount} test(s) to the same Lab Code ${updated.lab_code}.`
        : '';
      setMessage(`Saved changes for ${updated.lab_code}.${addedNote}`);
      loadList();
    } catch (err) {
      setError(err.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout activePage="manage-booking">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li><Link to="/franchise/manage-booking/new">Entry Section</Link></li>
              <li>Edit Entry</li>
            </ul>
          </nav>
          <h2 className="page-heading">Edit Entry</h2>
          <p className="portfolio-intro">
            Edit patient and test details only within 12 hours of registration. New tests you add
            stay on the same Lab Code — enter barcodes for any new sample types before saving.
          </p>
        </header>

        <section className="franchise-module-panel test-addition-search">
          <label className="test-addition-search-label" htmlFor="edit-entry-search">
            Search editable entries
          </label>
          <div className="test-addition-search-row">
            <input
              id="edit-entry-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  loadList(e.currentTarget.value);
                }
              }}
              placeholder="Lab code, patient name, or barcode"
            />
            <button
              type="button"
              className="btn-primary test-addition-search-btn"
              onClick={() => loadList(query)}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Search'}
            </button>
          </div>
        </section>

        {error && <p className="login-error" role="alert">{error}</p>}
        {message && <p className="form-success-msg">{message}</p>}

        {!editing && (
          <section className="franchise-module-panel">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Registered</th>
                    <th>Lab Code</th>
                    <th>Patient</th>
                    <th>Tests</th>
                    <th>Status</th>
                    <th>Edit window</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty-msg">
                        No entries within the 12-hour edit window.
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.date || '—'}</td>
                      <td>{row.lab_code}</td>
                      <td>{row.patient_name}</td>
                      <td>{row.test_names || row.test || '—'}</td>
                      <td>{row.status}</td>
                      <td>
                        {row.can_edit
                          ? formatHoursLeft(row.hours_left)
                          : 'Expired'}
                      </td>
                      <td>
                        {row.can_edit ? (
                          <button type="button" className="btn-secondary" onClick={() => openEdit(row)}>
                            Edit
                          </button>
                        ) : (
                          <span className="edit-entry-locked">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {editing && patient && (
          <section className="franchise-module-panel" aria-label="Edit registration">
            <div className="test-addition-summary">
              <div><span>Lab Code</span><strong>{editing.lab_code}</strong></div>
              <div><span>Status</span><strong>{editing.status}</strong></div>
              <div><span>Registered</span><strong>{editing.reg_date || editing.date}</strong></div>
              <div><span>Edit window</span><strong>{formatHoursLeft(editing.hours_left)}</strong></div>
            </div>

            <h3 className="test-addition-subtitle">Patient details</h3>
            <div className="edit-entry-patient-grid">
              <label>
                <span>Title</span>
                <select
                  value={patient.title}
                  onChange={(e) => setPatient({ ...patient, title: e.target.value })}
                >
                  <option>Mr.</option>
                  <option>Mrs.</option>
                  <option>Ms.</option>
                  <option>Dr.</option>
                </select>
              </label>
              <label>
                <span>Patient Name</span>
                <input
                  value={patient.patient_name}
                  onChange={(e) => setPatient({ ...patient, patient_name: e.target.value })}
                />
              </label>
              <label>
                <span>Mobile</span>
                <input
                  value={patient.mobile}
                  onChange={(e) => setPatient({ ...patient, mobile: e.target.value })}
                />
              </label>
              <label>
                <span>Doctor</span>
                <input
                  value={patient.doctor_name}
                  onChange={(e) => setPatient({ ...patient, doctor_name: e.target.value })}
                />
              </label>
              <label>
                <span>Age (years)</span>
                <input
                  type="number"
                  min="0"
                  value={patient.age_years}
                  onChange={(e) => setPatient({ ...patient, age_years: e.target.value })}
                />
              </label>
              <label>
                <span>City</span>
                <input
                  value={patient.city}
                  onChange={(e) => setPatient({ ...patient, city: e.target.value })}
                />
              </label>
              <label className="edit-entry-span-2">
                <span>Address</span>
                <input
                  value={patient.address}
                  onChange={(e) => setPatient({ ...patient, address: e.target.value })}
                />
              </label>
              <label className="edit-entry-span-2">
                <span>Comment</span>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
            </div>

            <h3 className="test-addition-subtitle">Tests on this entry</h3>
            {linkedBarcodes.length > 0 && (
              <>
                <p className="edit-entry-linked-label">Linked barcodes on this booking</p>
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

            <div className="reg-sketch-test-layout edit-entry-test-layout">
              <TestDualListPicker
                available={availableTests}
                selected={selected}
                onAdd={(items) => setSelected((prev) => [...prev, ...items])}
                onRemove={(ids) => setSelected((prev) => prev.filter((test) => !ids.includes(test.id)))}
                onRemoveAll={() => setSelected((prev) => prev.filter((test) => originalTestIds.has(test.id)))}
                testSearch={testSearch}
                onTestSearchChange={setTestSearch}
                selectedTestSearch={selectedTestSearch}
                onSelectedTestSearchChange={setSelectedTestSearch}
                formatLabel={formatFranchiseEditTest}
              />

              <div className="reg-sketch-sample-panel">
                {newlyAddedTests.length === 0 ? (
                  <p className="reg-sketch-empty edit-entry-barcode-hint">
                    Move new tests from the left list. Barcode fields appear here for each new sample type.
                  </p>
                ) : (
                  <>
                    <p className="edit-entry-new-tests-label">
                      New tests added ({newlyAddedTests.length}) — enter barcodes for this entry only
                    </p>
                    {sampleGroupsAlreadyLinked.length > 0 && (
                      <div className="test-addition-linked-samples">
                        <p className="test-addition-linked-samples-title">Sample types already linked</p>
                        <ul className="test-addition-current-list">
                          {sampleGroupsAlreadyLinked.map(({ sampleType }) => (
                            <li key={sampleType}>
                              {sampleType}
                              {' — '}
                              {linkedSampleTypes.get(sampleType.toLowerCase())}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <BarcodeLinkForm
                      sampleGroups={sampleGroupsNeedingBarcode}
                      sampleBarcodes={sampleBarcodes}
                      onBarcodeChange={updateBarcode}
                      registrationLayout
                    />
                  </>
                )}
              </div>
            </div>

            <div className="test-addition-actions">
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" className="btn-secondary" onClick={closeEdit} disabled={saving}>
                Back to list
              </button>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </Layout>
  );
}
