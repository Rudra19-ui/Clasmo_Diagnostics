import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import GenderRadioGroup from '../components/GenderRadioGroup';
import BarcodeLinkForm, { validateRegistrationBarcodes } from '../components/BarcodeLinkForm';
import TestDualListPicker from '../components/TestDualListPicker';
import { QrScanButton } from '../components/QrCameraScanner';
import { sanitizeBarcodeScannedValue } from '../utils/barcodeScan';
import { buildSampleBarcodePayload } from '../utils/barcodeScan';
import { useSystemDateTime } from '../hooks/useSystemDateTime';
import { api } from '../services/api';

const emptyPatient = () => ({
  patient_type: 'O.P.D.',
  title: 'Mr.',
  patient_name: '',
  gender: 'male',
  address: '',
  city: '',
  email: '',
  mobile: '',
  patient_id: '',
  date_of_birth: '',
  age_years: 0,
  age_months: 0,
  age_days: 0,
  doctor_name: '',
  doctor_title: 'Dr.',
  collection_center: 'CLASMO Diagnostics pvt',
  send_result_sms: false,
  is_register: false,
});

const formatTestOption = (test) => test.name;

function formatFranchiseRegistrationTest(test) {
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

function nextPatientId(currentId) {
  const num = parseInt(String(currentId || '0'), 10);
  return String((Number.isNaN(num) ? 0 : num) + 1).padStart(6, '0');
}

function nextLabCode(currentCode) {
  const code = String(currentCode || '');
  const match = code.match(/^(\D*)(\d+)$/);
  if (!match) return code;
  const [, prefix, digits] = match;
  return `${prefix}${String(parseInt(digits, 10) + 1).padStart(digits.length, '0')}`;
}

export default function Registration({
  activePage = 'registration',
  pageTitle = '',
  successNoun = 'Registration',
}) {
  const navigate = useNavigate();
  const isFranchiseBooking = activePage === 'manage-booking';
  const [patient, setPatient] = useState(emptyPatient());
  const [tests, setTests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [testSearch, setTestSearch] = useState('');
  const [selectedTestSearch, setSelectedTestSearch] = useState('');
  const [labCode, setLabCode] = useState('');
  const [comment, setComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [visiting, setVisiting] = useState(0);
  const [paid, setPaid] = useState(0);
  const [discountTest, setDiscountTest] = useState(0);
  const [discountRegn, setDiscountRegn] = useState(0);
  const [discountType, setDiscountType] = useState('Amt');
  const [discountReason, setDiscountReason] = useState('');
  const [discountAuthorization, setDiscountAuthorization] = useState('');
  const [discountReasons, setDiscountReasons] = useState([]);
  const [discountAuthorities, setDiscountAuthorities] = useState([]);
  const [trfName, setTrfName] = useState('');
  const [sampleBarcodes, setSampleBarcodes] = useState({});
  const [registrationBarcode, setRegistrationBarcode] = useState('');
  const [barcodeLookup, setBarcodeLookup] = useState(null);
  const [barcodeStatus, setBarcodeStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const registerDateTime = useSystemDateTime();

  const refreshNextPatientId = useCallback(() => {
    api.getNextPatientId()
      .then((d) => setPatient((prev) => ({ ...prev, patient_id: d.patient_id })))
      .catch(console.error);
  }, []);

  const resetForm = useCallback((nextIds) => {
    setPatient(emptyPatient());
    setSelected([]);
    setTestSearch('');
    setSelectedTestSearch('');
    setComment('');
    setVisiting(0);
    setPaid(0);
    setDiscountTest(0);
    setDiscountRegn(0);
    setDiscountType('Amt');
    setDiscountReason('');
    setDiscountAuthorization('');
    setTrfName('');
    setSampleBarcodes({});
    setRegistrationBarcode('');
    setBarcodeLookup(null);
    setBarcodeStatus('');
    setPaymentMethod('cash');
    const fileInput = document.getElementById('regPdfUpload');
    if (fileInput) fileInput.value = '';

    if (nextIds?.lab_code && nextIds?.patient_id) {
      setLabCode(nextIds.lab_code);
      setPatient({ ...emptyPatient(), patient_id: nextIds.patient_id });
      return;
    }

    api.getNextLabCode().then((d) => setLabCode(d.lab_code)).catch(console.error);
    api.getNextPatientId()
      .then((d) => setPatient({ ...emptyPatient(), patient_id: d.patient_id }))
      .catch(console.error);
  }, []);

  useEffect(() => {
    api.getTests().then(setTests).catch(console.error);
    api.getNextLabCode().then((d) => setLabCode(d.lab_code)).catch(console.error);
    refreshNextPatientId();
    api.getDiscountReasons({ is_active: true }).then(setDiscountReasons).catch(console.error);
    api.getDiscountAuthorities({ is_active: true }).then(setDiscountAuthorities).catch(console.error);
  }, [refreshNextPatientId]);

  const filteredAvailable = useMemo(() => {
    const q = testSearch.toLowerCase();
    const chosenIds = new Set(selected.map((s) => s.id));
    return tests.filter((t) => !chosenIds.has(t.id) && (!q || t.name.toLowerCase().includes(q)));
  }, [tests, testSearch, selected]);

  const sampleGroups = useMemo(() => {
    const groups = new Map();
    selected.forEach((test) => {
      getSampleTypes(test.sample_type).forEach((sampleType) => {
        if (!groups.has(sampleType)) groups.set(sampleType, []);
        groups.get(sampleType).push(test);
      });
    });
    return [...groups.entries()].map(([sampleType, groupTests]) => ({ sampleType, tests: groupTests }));
  }, [selected]);

  const total = selected.reduce((sum, t) => sum + Number(t.price), 0);
  const { testAmount, regnAmount } = calculateDiscountAmounts(
    total,
    discountTest,
    discountRegn,
    discountType,
  );
  const discount = testAmount + regnAmount;
  const net = total + Number(visiting || 0) - discount;
  const balance = net - Number(paid || 0);

  const addTests = (items) => {
    setSelected((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...items.filter((t) => !ids.has(t.id))];
    });
  };

  const removeSelectedTests = (ids) => {
    const removeIds = new Set(ids);
    setSelected((prev) => prev.filter((t) => !removeIds.has(t.id)));
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

  const handleBarcodeLookup = useCallback(async (rawValue) => {
    const code = sanitizeBarcodeScannedValue(rawValue ?? registrationBarcode);
    if (!code) {
      setBarcodeLookup(null);
      setBarcodeStatus('');
      return;
    }

    try {
      const result = await api.lookupPatientBarcode(code);
      if (result.found) {
        setBarcodeLookup(result);
        setBarcodeStatus(`Barcode already linked to Patient ${result.patient_id} (${result.patient_name})`);
      } else {
        setBarcodeLookup(null);
        setBarcodeStatus('New barcode — will link to Patient ID when you click Submit');
      }
    } catch {
      setBarcodeLookup(null);
      setBarcodeStatus('');
    }
  }, [registrationBarcode]);

  const openBarcodePatient = () => {
    if (!barcodeLookup?.found) return;
    const params = new URLSearchParams();
    if (barcodeLookup.lab_code) params.set('lab_code', barcodeLookup.lab_code);
    params.set('barcode', barcodeLookup.barcode);
    navigate(`/search?${params.toString()}`);
  };

  const handleSave = async () => {
    if (!patient.patient_name.trim()) {
      alert('Please enter Patient Name (required).');
      return false;
    }
    if (selected.length === 0) {
      alert('Please add at least one test.');
      return false;
    }

    const barcodeError = validateRegistrationBarcodes(registrationBarcode, sampleGroups, sampleBarcodes);
    if (barcodeError) {
      alert(barcodeError);
      return false;
    }

    const barcodePayload = buildSampleBarcodePayload(sampleGroups, sampleBarcodes);

    try {
      setIsSubmitting(true);
      const { doctor_title, ...patientFields } = patient;
      const result = await api.createRegistration({
        patient: {
          ...patientFields,
          doctor_name: [doctor_title, patient.doctor_name].filter(Boolean).join(' ').trim(),
        },
        comment,
        urgency: false,
        payment_method: paymentMethod,
        visiting_charges: visiting,
        paid,
        discount_test: testAmount,
        discount_regn: regnAmount,
        discount_type: discountType,
        discount_reason: discountReason,
        discount_authorization: discountAuthorization,
        tests: selected.map((t) => ({ test_id: t.id, price: t.price })),
        registration_barcode: sanitizeBarcodeScannedValue(registrationBarcode),
        sample_barcodes: barcodePayload,
      });
      const savedPatientId = result.patient?.patient_id || patient.patient_id;
      const savedBarcode = result.patient?.bar_code || registrationBarcode;
      alert(
        `${successNoun} saved successfully!\n`
        + `Patient ID: ${savedPatientId}\n`
        + `Lab Code: ${result.lab_code}`
        + (savedBarcode ? `\nBarcode linked: ${savedBarcode}\nStick this label on the blood tube.` : ''),
      );
      resetForm({
        lab_code: nextLabCode(result.lab_code),
        patient_id: nextPatientId(result.patient?.patient_id || patient.patient_id),
      });
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    if (!confirm('Clear all form data?')) return;
    resetForm();
  };

  return (
    <Layout activePage={activePage}>
      <main className="dash-main page-registration page-registration-sketch">
        {isFranchiseBooking && (
          <header className="franchise-booking-header">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <ul>
                <li><Link to="/dashboard">Home</Link></li>
                <li><Link to="/franchise/manage-booking/list">Entry Section</Link></li>
                <li>{pageTitle || 'New Entry'}</li>
              </ul>
            </nav>
            <h2 className="page-heading">{pageTitle || 'New Entry'}</h2>
            <p className="portfolio-intro">
              Same registration form and catalog data used for Test Registration — create a new patient booking here.
            </p>
          </header>
        )}
        <section className="reg-sketch-panel" aria-label="Patient information">
          <div className="reg-sketch-patient-grid">
            <div className="reg-sketch-col">
              <label className="reg-sketch-field">
                <span>Patient type</span>
                <select
                  value={patient.patient_type}
                  onChange={(e) => setPatient({ ...patient, patient_type: e.target.value })}
                >
                  <option>I.P.D.</option>
                  <option>O.P.D.</option>
                  <option>Corporate</option>
                </select>
              </label>

              <div className="reg-sketch-name-row">
                <label className="label-highlight-name">
                  Patient Name <span className="req">*</span>
                </label>
                <div className="name-row">
                  <select
                    className="field-highlight-name"
                    value={patient.title}
                    onChange={(e) => setPatient({ ...patient, title: e.target.value })}
                    aria-label="Patient title"
                  >
                    <option>Mr.</option>
                    <option>Mrs.</option>
                    <option>Ms.</option>
                    <option>Dr.</option>
                  </select>
                  <input
                    type="text"
                    className="field-highlight-name"
                    required
                    placeholder="Full name"
                    value={patient.patient_name}
                    onChange={(e) => setPatient({ ...patient, patient_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="reg-sketch-name-row">
                <label className="label-highlight-doctor">Doctor Name</label>
                <div className="name-row">
                  <select
                    className="field-highlight-doctor"
                    value={patient.doctor_title}
                    onChange={(e) => setPatient({ ...patient, doctor_title: e.target.value })}
                    aria-label="Doctor title"
                  >
                    <option>Dr.</option>
                    <option>Mr.</option>
                    <option>Mrs.</option>
                    <option>Ms.</option>
                  </select>
                  <input
                    type="text"
                    className="field-highlight-doctor"
                    placeholder="Full name"
                    value={patient.doctor_name}
                    onChange={(e) => setPatient({ ...patient, doctor_name: e.target.value })}
                  />
                </div>
              </div>

              <label className="reg-sketch-field">
                <span>Lab</span>
                <input
                  type="text"
                  value={patient.collection_center}
                  onChange={(e) => setPatient({ ...patient, collection_center: e.target.value })}
                />
              </label>

              <label className="reg-sketch-field reg-sketch-field--comment">
                <span>Enter Comment</span>
                <textarea
                  rows={4}
                  placeholder="Enter Comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
            </div>

            <div className="reg-sketch-col">
              <label className="reg-sketch-field">
                <span>Patient ID</span>
                <input
                  type="text"
                  readOnly
                  className="reg-sketch-datetime-auto"
                  value={patient.patient_id}
                  aria-label="Patient ID (assigned automatically in series)"
                />
              </label>

              <label className="reg-sketch-field">
                <span>Patient Barcode (Tube Label)</span>
                <div className="reg-sketch-barcode-input-row">
                  <input
                    type="text"
                    className="field-highlight-barcode"
                    placeholder="Enter pre-printed barcode number from tube label"
                    value={registrationBarcode}
                    onChange={(e) => {
                      setRegistrationBarcode(sanitizeBarcodeScannedValue(e.target.value));
                      setBarcodeLookup(null);
                      setBarcodeStatus('');
                    }}
                    onBlur={(e) => handleBarcodeLookup(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBarcodeLookup(e.currentTarget.value);
                      }
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Pre-printed tube barcode linked to patient on submit"
                  />
                  <QrScanButton
                    label="Scan QR"
                    title="Scan tube barcode with camera"
                    onScan={(value) => {
                      setRegistrationBarcode(value);
                      handleBarcodeLookup(value);
                    }}
                  />
                </div>
                <p className="reg-sketch-barcode-help-inline">
                  Enter any barcode number for testing. Create a QR with the same number on your phone, then pathologist scans it using Scan by Phone.
                </p>
                {barcodeStatus && (
                  <p className={`reg-sketch-barcode-status ${barcodeLookup?.found ? 'reg-sketch-barcode-status--linked' : ''}`}>
                    {barcodeStatus}
                    {barcodeLookup?.found && (
                      <button type="button" className="reg-sketch-barcode-open" onClick={openBarcodePatient}>
                        Open Patient
                      </button>
                    )}
                  </p>
                )}
              </label>

              <label className="reg-sketch-field">
                <span>Register Date &amp; Time</span>
                <input
                  type="text"
                  readOnly
                  className="reg-sketch-datetime-auto"
                  value={registerDateTime}
                  aria-label="Register date and time (set automatically from system)"
                />
              </label>

              <div className="reg-sketch-name-row reg-sketch-age-row">
                <label className="label-highlight-age">Age</label>
                <div className="age-gender-row">
                  <div className="age-group">
                    <input
                      type="number"
                      min="0"
                      className="field-highlight-age reg-sketch-age-years"
                      placeholder="Years"
                      value={patient.age_years || ''}
                      onChange={(e) => setPatient({
                        ...patient,
                        age_years: Number(e.target.value) || 0,
                        age_months: 0,
                        age_days: 0,
                      })}
                      aria-label="Age in years"
                    />
                    <span>Yrs</span>
                  </div>
                  <GenderRadioGroup
                    includeNone={false}
                    value={patient.gender}
                    onChange={(gender) => setPatient({ ...patient, gender })}
                  />
                </div>
              </div>

              <label className="reg-sketch-field">
                <span>Mobile Number</span>
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={patient.mobile}
                  onChange={(e) => setPatient({ ...patient, mobile: e.target.value })}
                />
              </label>

              <label className="reg-sketch-field">
                <span>Email</span>
                <input
                  type="email"
                  value={patient.email}
                  onChange={(e) => setPatient({ ...patient, email: e.target.value })}
                />
              </label>

              <div className="reg-sketch-field reg-sketch-upload">
                <span>Upload PDF</span>
                <div className="reg-sketch-upload-box">
                  <input
                    type="file"
                    hidden
                    id="regPdfUpload"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setTrfName(e.target.files[0]?.name || '')}
                  />
                  <button type="button" onClick={() => document.getElementById('regPdfUpload').click()}>
                    Choose File
                  </button>
                  <span>{trfName || 'No file chosen'}</span>
                </div>
              </div>

              <label className="reg-sketch-field reg-sketch-field--inline">
                <span>Lab Code</span>
                <input type="text" readOnly value={labCode} />
              </label>
            </div>
          </div>
        </section>

        <section className="reg-sketch-panel" aria-label="Test selection">
          <div className="reg-sketch-total-bill reg-sketch-total-bill--top">
            <span>Total Bill :</span>
            <strong>Rs. {total > 0 ? total.toFixed(0) : 0}</strong>
          </div>

          <div className="reg-sketch-test-layout">
            <TestDualListPicker
              available={filteredAvailable}
              selected={selected}
              onAdd={addTests}
              onRemove={removeSelectedTests}
              onRemoveAll={() => setSelected([])}
              testSearch={testSearch}
              onTestSearchChange={setTestSearch}
              selectedTestSearch={selectedTestSearch}
              onSelectedTestSearchChange={setSelectedTestSearch}
              formatLabel={isFranchiseBooking ? formatFranchiseRegistrationTest : formatTestOption}
            />

            <div className="reg-sketch-sample-panel">
              <BarcodeLinkForm
                sampleGroups={sampleGroups}
                sampleBarcodes={sampleBarcodes}
                onBarcodeChange={updateBarcode}
                registrationLayout
              />
            </div>
          </div>
        </section>

        <section className="reg-sketch-panel reg-sketch-tally" aria-label="Billing tally">
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
              <input readOnly value={total.toFixed(2)} />
            </label>
            <label>
              <span>Total Discount</span>
              <input readOnly value={discount.toFixed(2)} />
            </label>
            <label>
              <span>Visiting</span>
              <input type="number" value={visiting} onChange={(e) => setVisiting(e.target.value)} />
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </button>
            <button type="button" className="reg-sketch-clear" onClick={handleClear} disabled={isSubmitting}>
              Clear
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </Layout>
  );
}
