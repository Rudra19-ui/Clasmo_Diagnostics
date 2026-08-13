import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { getEffectiveTestPrice, withEffectivePrice } from '../../utils/testPricing';

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

function getSampleTypes(sampleType) {
  const raw = (sampleType || 'General').trim();
  const parts = raw.split(/[,/|]/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : ['General'];
}

function getFranchiseBillAmount(test) {
  return getEffectiveTestPrice(test);
}

function calculateDiscountAmounts(total, discountTest, discountRegn, discountType) {
  const testValue = Number(discountTest || 0);
  const regnValue = Number(discountRegn || 0);
  if (discountType === '%') {
    return {
      testAmount: (total * testValue) / 100,
      regnAmount: (total * regnValue) / 100,
    };
  }
  return { testAmount: testValue, regnAmount: regnValue };
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
  const [sampleBarcodes, setSampleBarcodes] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paid, setPaid] = useState(0);
  const [discountTest, setDiscountTest] = useState(0);
  const [discountRegn, setDiscountRegn] = useState(0);
  const [discountType, setDiscountType] = useState('Amt');
  const [discountReason, setDiscountReason] = useState('');
  const [discountAuthorization, setDiscountAuthorization] = useState('');
  const [discountReasons, setDiscountReasons] = useState([]);
  const [discountAuthorities, setDiscountAuthorities] = useState([]);

  useEffect(() => {
    api.getTests()
      .then((rows) => setCatalog(Array.isArray(rows) ? rows.map(withEffectivePrice) : []))
      .catch(() => setCatalog([]));
    api.getDiscountReasons({ is_active: true }).then(setDiscountReasons).catch(() => {});
    api.getDiscountAuthorities({ is_active: true }).then(setDiscountAuthorities).catch(() => {});
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

  const sampleGroups = useMemo(
    () => buildSampleGroups(selectedExtra),
    [selectedExtra],
  );

  const sampleGroupsNeedingBarcode = useMemo(
    () => sampleGroups.filter(
      (group) => !linkedSampleTypes.has(group.sampleType.toLowerCase()),
    ),
    [sampleGroups, linkedSampleTypes],
  );

  const sampleGroupsAlreadyLinked = useMemo(
    () => sampleGroups.filter(
      (group) => linkedSampleTypes.has(group.sampleType.toLowerCase()),
    ),
    [sampleGroups, linkedSampleTypes],
  );

  const additionTotal = useMemo(
    () => selectedExtra.reduce((sum, test) => sum + getFranchiseBillAmount(test), 0),
    [selectedExtra],
  );

  const { testAmount, regnAmount } = calculateDiscountAmounts(
    additionTotal,
    discountTest,
    discountRegn,
    discountType,
  );
  const discount = testAmount + regnAmount;
  const net = additionTotal - discount;
  const balance = net - Number(paid || 0);

  const resetAdditionForm = useCallback(() => {
    setSelectedExtra([]);
    setTestSearch('');
    setSelectedTestSearch('');
    setSampleBarcodes({});
    setPaymentMethod('cash');
    setPaid(0);
    setDiscountTest(0);
    setDiscountRegn(0);
    setDiscountType('Amt');
    setDiscountReason('');
    setDiscountAuthorization('');
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
    resetAdditionForm();
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
        + 'Select tests below, assign barcodes for new samples, and record payment.',
      );
    } catch (err) {
      setError(err.message || 'Could not find this booking.');
    } finally {
      setSearching(false);
    }
  }, [barcode, labCode, patientId, loadLinkedBarcodes, resetAdditionForm]);

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
    if (!registration?.lab_code) {
      setError('Search and load a booking first.');
      return;
    }
    if (!selectedExtra.length) {
      setError('Select at least one test to add.');
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
    const addedCount = selectedExtra.length;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await api.addRegistrationTests(registration.lab_code, {
        test_ids: selectedExtra.map((test) => test.id),
        sample_barcodes: sampleBarcodePayload,
        paid: Number(paid || 0),
        payment_method: paymentMethod,
        discount_test: testAmount,
        discount_regn: regnAmount,
        discount_type: discountType,
        discount_reason: discountReason,
        discount_authorization: discountAuthorization,
      });
      setRegistration(updated);
      await loadLinkedBarcodes(updated);
      resetAdditionForm();
      setMessage(
        `Added ${addedCount} test(s) to ${updated.lab_code}. `
        + `Payment recorded: ₹${Number(paid || 0).toFixed(2)}.`,
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
            After New Entry, open this page later and search the same patient by barcode,
            Lab Code, or Patient ID to add more tests on the same booking.
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
          <>
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
            </section>

            <section className="reg-sketch-panel" aria-label="Add tests">
              <div className="reg-sketch-total-bill reg-sketch-total-bill--top">
                <span>Additional tests bill :</span>
                <strong>Rs. {additionTotal > 0 ? additionTotal.toFixed(0) : 0}</strong>
              </div>

              <div className="reg-sketch-test-layout">
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
                  formatLabel={(test) => test.name}
                />

                <div className="reg-sketch-sample-panel">
                  {sampleGroupsAlreadyLinked.length > 0 && (
                    <div className="test-addition-linked-samples">
                      <p className="test-addition-linked-samples-title">Already linked sample types</p>
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
                </div>
              </div>
            </section>

            <section className="reg-sketch-panel reg-sketch-tally" aria-label="Payment tally">
              <h3>Tally</h3>

              <div className="reg-sketch-discount-row">
                <label className="reg-sketch-discount-item">
                  <span>Discount (Test)</span>
                  <input
                    type="number"
                    min="0"
                    step={discountType === '%' ? '0.01' : '1'}
                    value={discountTest}
                    onChange={(e) => setDiscountTest(e.target.value)}
                  />
                </label>
                <label className="reg-sketch-discount-item">
                  <span>Discount (Regn)</span>
                  <input
                    type="number"
                    min="0"
                    step={discountType === '%' ? '0.01' : '1'}
                    value={discountRegn}
                    onChange={(e) => setDiscountRegn(e.target.value)}
                  />
                </label>
                <label className="reg-sketch-discount-item reg-sketch-discount-item--type">
                  <span>Type</span>
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                    <option value="Amt">Amt</option>
                    <option value="%">%</option>
                  </select>
                </label>
                <label className="reg-sketch-discount-item">
                  <span>Reason</span>
                  <select value={discountReason} onChange={(e) => setDiscountReason(e.target.value)}>
                    <option value="">— Select —</option>
                    {discountReasons.map((item) => (
                      <option key={item.id} value={item.reason}>{item.reason}</option>
                    ))}
                    {!discountReasons.length && (
                      <>
                        <option value="Staff">Staff</option>
                        <option value="Corporate">Corporate</option>
                        <option value="Camp">Camp</option>
                      </>
                    )}
                  </select>
                </label>
                <label className="reg-sketch-discount-item">
                  <span>Authorisation</span>
                  <select
                    value={discountAuthorization}
                    onChange={(e) => setDiscountAuthorization(e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {discountAuthorities.map((item) => (
                      <option key={item.id} value={item.authorization_name}>
                        {item.authorization_name}
                      </option>
                    ))}
                    {!discountAuthorities.length && (
                      <>
                        <option value="Manager">Manager</option>
                        <option value="Director">Director</option>
                      </>
                    )}
                  </select>
                </label>
              </div>

              {discountType === '%' && discount > 0 && (
                <p className="reg-sketch-discount-note">
                  Applied discount: Test ₹{testAmount.toFixed(2)} + Regn ₹{regnAmount.toFixed(2)} = ₹{discount.toFixed(2)}
                </p>
              )}

              <div className="reg-sketch-tally-grid">
                <label>
                  <span>Total</span>
                  <input readOnly value={additionTotal.toFixed(2)} />
                </label>
                <label>
                  <span>Total Discount</span>
                  <input readOnly value={discount.toFixed(2)} />
                </label>
                <label>
                  <span>Net Amount</span>
                  <input readOnly value={net.toFixed(2)} />
                </label>
                <label>
                  <span>Paid</span>
                  <input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} />
                </label>
                <label>
                  <span>Balance</span>
                  <input readOnly value={balance.toFixed(2)} />
                </label>
                <label>
                  <span>Payment</span>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="cash">Cash</option>
                    <option value="credit">Credit Card</option>
                    <option value="debit">Debit Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="others">Others</option>
                  </select>
                </label>
              </div>

              <div className="reg-sketch-submit-row">
                <button
                  type="button"
                  className="reg-sketch-submit"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Submitting…' : 'Submit'}
                </button>
                <button
                  type="button"
                  className="reg-sketch-clear"
                  onClick={resetAdditionForm}
                  disabled={saving}
                >
                  Clear
                </button>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </Layout>
  );
}
