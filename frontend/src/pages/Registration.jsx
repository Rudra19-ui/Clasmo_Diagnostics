import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DatePicker from '../components/DatePicker';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import TestBillModal from '../components/TestBillModal';
import { api } from '../services/api';
import { calculateAge, formatDateTime, parseDDMMYYYY } from '../utils/date';

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
  collection_center: 'CLASMO Diagnostics pvt',
  send_result_sms: false,
  is_register: false,
});

export default function Registration() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState(emptyPatient());
  const [tests, setTests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [selectedAvailable, setSelectedAvailable] = useState([]);
  const [selectedChosen, setSelectedChosen] = useState([]);
  const [testSearch, setTestSearch] = useState('');
  const [labCode, setLabCode] = useState('');
  const [comment, setComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [visiting, setVisiting] = useState(0);
  const [paid, setPaid] = useState(0);
  const [urgency, setUrgency] = useState(false);
  const [discountTest, setDiscountTest] = useState(0);
  const [discountRegn, setDiscountRegn] = useState(0);
  const [showTestBill, setShowTestBill] = useState(false);
  const [trfName, setTrfName] = useState('');
  const [registrationDate] = useState(() => new Date());
  const now = formatDateTime(registrationDate);

  const handleDateOfBirthChange = (dateOfBirth) => {
    const dob = parseDDMMYYYY(dateOfBirth);
    if (!dob) {
      setPatient((prev) => ({
        ...prev,
        date_of_birth: dateOfBirth,
        ...(dateOfBirth ? {} : { age_years: 0, age_months: 0, age_days: 0 }),
      }));
      return;
    }
    const age = calculateAge(dob, registrationDate);
    setPatient((prev) => ({
      ...prev,
      date_of_birth: dateOfBirth,
      age_years: age.years,
      age_months: age.months,
      age_days: age.days,
    }));
  };

  useEffect(() => {
    api.getTests().then(setTests).catch(console.error);
    api.getNextLabCode().then((d) => setLabCode(d.lab_code)).catch(console.error);
  }, []);

  const filteredAvailable = useMemo(() => {
    const q = testSearch.toLowerCase();
    const chosenIds = new Set(selected.map((s) => s.id));
    return tests.filter((t) => !chosenIds.has(t.id) && (!q || t.name.toLowerCase().includes(q)));
  }, [tests, testSearch, selected]);

  const total = selected.reduce((sum, t) => sum + Number(t.price), 0);
  const discount = Number(discountTest || 0) + Number(discountRegn || 0);
  const net = total + Number(visiting || 0) - discount;
  const balance = net - Number(paid || 0);

  const addTests = (items) => {
    setSelected((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...items.filter((t) => !ids.has(t.id))];
    });
  };

  const handleSave = async () => {
    if (!patient.patient_name.trim()) {
      alert('Please enter Patient Name (required).');
      return false;
    }
    try {
      const result = await api.createRegistration({
        patient,
        comment,
        urgency,
        payment_method: paymentMethod,
        visiting_charges: visiting,
        paid,
        tests: selected.map((t) => ({ test_id: t.id, price: t.price })),
      });
      alert(`Registration saved successfully!\nLab Code: ${result.lab_code}`);
      setLabCode(result.lab_code);
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    }
  };

  const handleProceed = () => {
    if (!patient.patient_name.trim()) {
      alert('Please enter Patient Name (required).');
      return;
    }
    if (selected.length === 0) {
      alert('Please select at least one test.');
      return;
    }
    setShowTestBill(true);
  };

  const handleModalSave = async () => {
    const saved = await handleSave();
    if (saved) setShowTestBill(false);
  };

  const handleModalTestResult = async () => {
    const saved = await handleSave();
    if (saved) navigate('/test-result');
  };

  const handleClear = () => {
    if (!confirm('Clear all form data?')) return;
    setPatient(emptyPatient());
    setSelected([]);
    setComment('');
    setVisiting(0);
    setPaid(0);
    setUrgency(false);
    setDiscountTest(0);
    setDiscountRegn(0);
    setShowTestBill(false);
    setTrfName('');
    api.getNextLabCode().then((d) => setLabCode(d.lab_code)).catch(console.error);
  };

  return (
    <Layout activePage="registration">
      <main className="dash-main page-registration">
        <section className="form-grid" aria-label="Patient information">
          <div className="form-col">
            <div className="form-row">
              <label>Patient Type</label>
              <select value={patient.patient_type} onChange={(e) => setPatient({ ...patient, patient_type: e.target.value })}>
                <option>O.P.D.</option><option>I.P.D.</option><option>Corporate</option>
              </select>
            </div>
            <div className="form-row">
              <label className="label-highlight-name">Patient Name <span className="req">*</span></label>
              <div className="name-row">
                <select className="field-highlight-name" value={patient.title} onChange={(e) => setPatient({ ...patient, title: e.target.value })}>
                  <option>Mr.</option><option>Mrs.</option><option>Ms.</option><option>Dr.</option>
                </select>
                <input type="text" className="field-highlight-name" required placeholder="Full name" value={patient.patient_name} onChange={(e) => setPatient({ ...patient, patient_name: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <label>Gender</label>
              <div className="radio-group">
                {['male', 'female', 'none'].map((g) => (
                  <label key={g}>
                    <input type="radio" name="gender" checked={patient.gender === g} onChange={() => setPatient({ ...patient, gender: g })} />
                    {g === 'male' ? ' Male' : g === 'female' ? ' Female' : ' None'}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-row"><label>Address</label><input value={patient.address} onChange={(e) => setPatient({ ...patient, address: e.target.value })} /></div>
            <div className="form-row"><label className="label-highlight-doctor">Doctor Name</label><input className="field-highlight-doctor" value={patient.doctor_name} onChange={(e) => setPatient({ ...patient, doctor_name: e.target.value })} /><button type="button" className="btn-add">+</button></div>
            <div className="form-row"><label>Barcode</label><a href="#">Manage Barcode</a></div>
            <div className="form-row"><label></label><label><input type="checkbox" checked={patient.send_result_sms} onChange={(e) => setPatient({ ...patient, send_result_sms: e.target.checked })} /> Send Result in SMS</label></div>
          </div>

          <div className="form-col">
            <div className="form-row"><label>Patient ID</label><input value={patient.patient_id} onChange={(e) => setPatient({ ...patient, patient_id: e.target.value })} /></div>
            <div className="form-row">
              <label className="label-highlight-age">Age</label>
              <div className="age-group">
                <input
                  type="text"
                  className="short age-readonly"
                  readOnly
                  tabIndex={-1}
                  placeholder="0"
                  value={patient.date_of_birth ? patient.age_years : ''}
                />
                <span>Y</span>
                <input
                  type="text"
                  className="short age-readonly"
                  readOnly
                  tabIndex={-1}
                  placeholder="0"
                  value={patient.date_of_birth ? patient.age_months : ''}
                />
                <span>M</span>
                <input
                  type="text"
                  className="short age-readonly"
                  readOnly
                  tabIndex={-1}
                  placeholder="0"
                  value={patient.date_of_birth ? patient.age_days : ''}
                />
                <span>D</span>
              </div>
            </div>
            <div className="form-row"><label>Email</label><input type="email" value={patient.email} onChange={(e) => setPatient({ ...patient, email: e.target.value })} /></div>
            <div className="form-row"><label>City</label><input value={patient.city} onChange={(e) => setPatient({ ...patient, city: e.target.value })} /></div>
            <div className="form-row"><label></label><label><input type="checkbox" checked={patient.is_register} onChange={(e) => setPatient({ ...patient, is_register: e.target.checked })} /> Is Register</label></div>
          </div>

          <div className="form-col">
            <div className="form-row"><label>Lab Code</label><input value={labCode} readOnly /></div>
            <div className="form-row"><label>Registration Date</label><input value={now} readOnly /></div>
            <div className="form-row">
              <label>Date of Birth</label>
              <DatePicker
                value={patient.date_of_birth}
                onChange={handleDateOfBirthChange}
                maxDate={registrationDate}
              />
            </div>
            <div className="form-row"><label>Mobile Number</label><input type="tel" value={patient.mobile} onChange={(e) => setPatient({ ...patient, mobile: e.target.value })} /></div>
            <div className="form-row"><label className="label-highlight-center">Collection Center</label><input className="field-highlight-center" value={patient.collection_center} onChange={(e) => setPatient({ ...patient, collection_center: e.target.value })} /></div>
            <div className="form-row"><label>Collection Date</label><input value={now} readOnly /></div>
          </div>
        </section>

        <section className="test-section">
          <div className="test-filters">
            <label>Search By</label>
            <select><option>Short Name</option><option>Test Code</option><option>Full Name</option></select>
            <input type="search" placeholder="Search tests..." value={testSearch} onChange={(e) => setTestSearch(e.target.value)} />
            <label>Select Test Category</label>
            <select><option value="">-- All --</option><option>Biochemistry</option><option>Hematology</option><option>Serology</option></select>
            <label>Select Test Profile</label>
            <select><option value="">-- None --</option><option>Full Body Checkup</option><option>Diabetes Panel</option></select>
          </div>

          <div className="dual-list">
            <div className="list-panel">
              <div className="list-tabs"><button type="button" className="active">Favourite Tests</button><button type="button">Test List</button></div>
              <h4>Test List</h4>
              <select multiple size="12" value={selectedAvailable} onChange={(e) => setSelectedAvailable([...e.target.selectedOptions].map((o) => Number(o.value)))}>
                {filteredAvailable.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="list-actions">
              <button type="button" onClick={() => addTests(filteredAvailable.filter((t) => selectedAvailable.includes(t.id)))}>Add &gt;&gt;</button>
              <button type="button" onClick={() => addTests(filteredAvailable)}>Add All &gt;&gt;</button>
              <button type="button" onClick={() => setSelected((prev) => prev.filter((t) => !selectedChosen.includes(t.id)))}>&lt;&lt; Remove</button>
              <button type="button" onClick={() => setSelected([])}>&lt;&lt; Remove All</button>
            </div>
            <div className="list-panel">
              <h4>Selected Test List</h4>
              <div className="selected-header"><span>Test Name</span><span>Price</span><span>Discount</span><span>Refund</span></div>
              <select multiple size="12" value={selectedChosen.map(String)} onChange={(e) => setSelectedChosen([...e.target.selectedOptions].map((o) => Number(o.value)))}>
                {selected.map((t) => <option key={t.id} value={t.id}>{t.name} | ₹{Number(t.price).toFixed(2)} | 0 | 0</option>)}
              </select>
            </div>
          </div>

          <div className="comment-row">
            <div><label>Enter Comment</label><textarea placeholder="Enter Comment" value={comment} onChange={(e) => setComment(e.target.value)} /></div>
            <div className="upload-trf">
              <label>Upload TRF</label>
              <input type="file" hidden id="trfUpload" onChange={(e) => setTrfName(e.target.files[0]?.name || '')} />
              <button type="button" onClick={() => document.getElementById('trfUpload').click()}>Choose File</button>
              <span style={{ fontSize: 11, color: '#666' }}>{trfName}</span>
            </div>
          </div>
        </section>

        <section className="billing-section">
          <div className="billing-row">
            <label>Discount (Test)</label><input type="number" value={discountTest} onChange={(e) => setDiscountTest(e.target.value)} />
            <label>Discount (Regn)</label><input type="number" value={discountRegn} onChange={(e) => setDiscountRegn(e.target.value)} />
            <select><option>Amt</option><option>%</option></select>
            <label>Reason</label><select><option>— Select —</option><option>Staff</option><option>Corporate</option><option>Camp</option></select>
            <label>Authorisation</label><select><option>— Select —</option><option>Manager</option><option>Director</option></select>
          </div>
          <div className="billing-row payment-methods">
            <span>Payment:</span>
            {['cash', 'credit', 'debit', 'cheque', 'others'].map((m) => (
              <label key={m}>
                <input type="radio" name="payment" checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} />
                {m === 'cash' ? ' Cash' : m === 'credit' ? ' Credit Card' : m === 'debit' ? ' Debit Card' : m === 'cheque' ? ' Cheque' : ' Others'}
              </label>
            ))}
          </div>
          <div className="billing-row">
            <label><input type="checkbox" checked={urgency} onChange={(e) => setUrgency(e.target.checked)} /> Urgency</label>
            <label>Total</label><input readOnly value={total.toFixed(2)} />
            <label>Visiting Charges</label><input type="number" value={visiting} onChange={(e) => setVisiting(e.target.value)} />
            <label>Net Amount</label><input readOnly value={net.toFixed(2)} />
            <label>Paid</label><input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} />
            <label>Balance</label><input readOnly value={balance.toFixed(2)} />
            <label>Refund Amount</label><input type="number" defaultValue="0" />
            <label>Recovery Amount</label><input type="number" defaultValue="0" />
            <label>Bill Receipt No.</label><input type="text" className="wide" />
          </div>
        </section>
      </main>

      <div className="dash-actions">
        <Link to="/search">&lt;&lt; Test Search</Link>
        <button type="button" className="primary" onClick={handleSave}>Save</button>
        <button type="button" onClick={handleProceed}>Proceed &gt;&gt;</button>
        <button type="button" onClick={handleClear}>Clear</button>
      </div>
      <Footer />

      <TestBillModal
        open={showTestBill}
        onClose={() => setShowTestBill(false)}
        tests={selected}
        subTotal={total}
        discount={discount}
        charges={0}
        visitingCharges={visiting}
        netAmount={net}
        paid={paid}
        balance={balance}
        onSave={handleModalSave}
        onTestResult={handleModalTestResult}
      />
    </Layout>
  );
}
