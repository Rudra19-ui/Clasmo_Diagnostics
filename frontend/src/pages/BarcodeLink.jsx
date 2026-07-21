import { useState } from 'react';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import BarcodeLinkForm, { validateBarcodePayload } from '../components/BarcodeLinkForm';
import { api } from '../services/api';

function getPrimarySampleType(sampleType) {
  const raw = (sampleType || 'General').trim();
  return raw.split(/[,/|]/)[0].trim() || 'General';
}

export default function BarcodeLink() {
  const [patientId, setPatientId] = useState('');
  const [labCode, setLabCode] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [registrationInfo, setRegistrationInfo] = useState(null);
  const [sampleGroups, setSampleGroups] = useState([]);
  const [sampleBarcodes, setSampleBarcodes] = useState({});
  const [linkedBarcodes, setLinkedBarcodes] = useState([]);

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

  const handleLookup = async () => {
    const pid = patientId.trim();
    const code = labCode.trim();
    if (!pid && !code) {
      setLookupError('Enter Patient ID or Lab Code.');
      return;
    }

    setIsLookingUp(true);
    setLookupError('');
    setLinkError('');
    setLinkSuccess('');

    try {
      let registration = null;
      if (code) {
        registration = await api.getRegistration(code);
      } else {
        const results = await api.searchRegistrations({ patient_id: pid });
        registration = results[0] || null;
      }

      if (!registration) {
        setPatientInfo(null);
        setRegistrationInfo(null);
        setSampleGroups([]);
        setLinkedBarcodes([]);
        setLookupError('No registration found for the given details.');
        return;
      }

      const patient = registration.patient || {};
      setPatientInfo(patient);
      setRegistrationInfo(registration);
      setPatientId(patient.patient_id || pid);
      setLabCode(registration.lab_code || code);

      const groups = new Map();
      (registration.tests || []).forEach((item) => {
        const sampleType = getPrimarySampleType(item.sample_type || item.test?.sample_type);
        if (!groups.has(sampleType)) groups.set(sampleType, []);
        groups.get(sampleType).push({
          name: item.test_name || item.test?.name || 'Test',
        });
      });
      const nextGroups = [...groups.entries()].map(([sampleType, tests]) => ({ sampleType, tests }));
      setSampleGroups(nextGroups.length ? nextGroups : [{ sampleType: 'General', tests: [] }]);

      const existing = await api.getPatientBarcodes({
        registration_id: registration.id,
      });
      setLinkedBarcodes(existing);
      setSampleBarcodes({});
    } catch (err) {
      setLookupError(err.message || 'Lookup failed.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleLinkSubmit = async (barcodesPayload) => {
    const validationError = validateBarcodePayload(barcodesPayload);
    if (validationError) {
      setLinkError(validationError);
      return;
    }
    if (!barcodesPayload.length) {
      setLinkError('Enter at least one barcode to link.');
      return;
    }

    setIsSubmitting(true);
    setLinkError('');
    setLinkSuccess('');

    try {
      const result = await api.linkPatientBarcodes({
        patient_id: patientInfo?.patient_id || patientId.trim(),
        lab_code: registrationInfo?.lab_code || labCode.trim(),
        registration_id: registrationInfo?.id,
        barcodes: barcodesPayload,
      });
      setLinkedBarcodes(result.linked_barcodes || []);
      setSampleBarcodes({});
      setLinkSuccess(`Linked ${result.linked_barcodes?.length || 0} barcode(s) successfully.`);
    } catch (err) {
      setLinkError(err.message || 'Failed to link barcode.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout activePage="barcode-link">
      <main className="dash-main page-barcode-link">
        <section className="barcode-link-panel">
          <h1 className="barcode-link-title">Link Preprinted Barcode</h1>
          <p className="barcode-link-intro">
            Scan a preprinted sample barcode and associate it with a patient record using Patient ID or Lab Code.
          </p>

          <div className="barcode-link-lookup">
            <label className="reg-sketch-field">
              <span>Patient ID</span>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g. 000001"
              />
            </label>
            <label className="reg-sketch-field">
              <span>Lab Code</span>
              <input
                type="text"
                value={labCode}
                onChange={(e) => setLabCode(e.target.value)}
                placeholder="e.g. 170"
              />
            </label>
            <button type="button" className="barcode-link-submit" onClick={handleLookup} disabled={isLookingUp}>
              {isLookingUp ? 'Searching…' : 'Find Patient'}
            </button>
          </div>

          {lookupError && <p className="barcode-link-message barcode-link-message--error">{lookupError}</p>}

          {patientInfo && (
            <div className="barcode-link-patient">
              <h2>Patient Record</h2>
              <div className="barcode-link-patient-grid">
                <div><strong>Patient ID:</strong> {patientInfo.patient_id || '—'}</div>
                <div><strong>Name:</strong> {patientInfo.patient_name || '—'}</div>
                <div><strong>Lab Code:</strong> {registrationInfo?.lab_code || '—'}</div>
                <div><strong>Mobile:</strong> {patientInfo.mobile || '—'}</div>
              </div>
            </div>
          )}

          {linkedBarcodes.length > 0 && (
            <div className="barcode-link-existing">
              <h3>Linked Barcodes</h3>
              <ul>
                {linkedBarcodes.map((item) => (
                  <li key={item.id}>
                    <strong>{item.sample_type || 'General'}</strong>: {item.barcode}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {patientInfo && (
            <BarcodeLinkForm
              sampleGroups={sampleGroups}
              sampleBarcodes={sampleBarcodes}
              onBarcodeChange={updateBarcode}
              onSubmit={handleLinkSubmit}
              isSubmitting={isSubmitting}
              submitLabel="Link Barcode to Patient"
            />
          )}

          {linkError && <p className="barcode-link-message barcode-link-message--error">{linkError}</p>}
          {linkSuccess && <p className="barcode-link-message barcode-link-message--success">{linkSuccess}</p>}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
