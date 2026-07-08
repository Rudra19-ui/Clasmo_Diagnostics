import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { canVerifyReports } from '../utils/roles';
import { calculateResultFlag, groupParameters, isAbnormalFlag, selectReferenceRange } from '../utils/resultFlags';
import { printBillReceipt } from '../utils/printBillReceipt';
import '../styles/test-result-entry.css';

const DEFAULT_INTERPRETATION = {
  'Serum Creatinine': 'A creatinine blood test measures the level of creatinine in the blood.',
};

export default function TestResultEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const registrationId = Number(searchParams.get('registrationId'));
  const registrationIds = location.state?.registrationIds || (registrationId ? [registrationId] : []);

  const [report, setReport] = useState(null);
  const [values, setValues] = useState({});
  const [selectedTests, setSelectedTests] = useState({});
  const [testNormal, setTestNormal] = useState({});
  const [interpretations, setInterpretations] = useState({});
  const [remarks, setRemarks] = useState({});
  const [barcode, setBarcode] = useState('');
  const [showHeader, setShowHeader] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadReport = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await api.getReport(id);
      setReport(data);
      setBarcode(data.lab_code || '');

      const initialValues = {};
      (data.values || []).forEach((item) => {
        initialValues[item.parameter] = item.value;
      });
      (data.parameters || []).forEach((param) => {
        if (initialValues[param.id] === undefined) initialValues[param.id] = '';
      });
      setValues(initialValues);

      const tests = {};
      (data.ordered_tests || []).forEach((test) => {
        tests[test.name] = true;
      });
      setSelectedTests(tests);

      const normalMap = {};
      const interpMap = {};
      Object.keys(groupParameters(data.parameters || [])).forEach((testName) => {
        normalMap[testName] = true;
        interpMap[testName] = DEFAULT_INTERPRETATION[testName] || '';
      });
      setTestNormal(normalMap);
      setInterpretations(interpMap);
      setRemarks({});
    } catch (err) {
      setError(err.message || 'Failed to load test result.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(registrationId);
  }, [registrationId, loadReport]);

  const parameterGroups = useMemo(
    () => groupParameters(report?.parameters || []),
    [report],
  );

  const visibleGroups = useMemo(
    () => Object.entries(parameterGroups).filter(([testName]) => selectedTests[testName] !== false),
    [parameterGroups, selectedTests],
  );

  const currentIndex = registrationIds.indexOf(registrationId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < registrationIds.length - 1;

  const navigateToRegistration = (id) => {
    navigate(`/test-result-entry?registrationId=${id}`, {
      state: { registrationIds },
      replace: true,
    });
  };

  const buildPayload = () => ({
    values: Object.entries(values)
      .filter(([, value]) => value !== '')
      .map(([parameter_id, value]) => ({
        parameter_id: Number(parameter_id),
        value: String(value),
      })),
  });

  const handleSave = async (verify = false) => {
    if (!registrationId) return;
    const payload = buildPayload();
    if (!payload.values.length) {
      setError('Enter at least one result value.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await api.submitReport(registrationId, { ...payload, verify });
      setReport(data);
      setMessage(verify ? 'Results saved and report released.' : 'Results saved successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save results.');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAll = async () => {
    if (!registrationId) return;
    setSaving(true);
    setError('');
    try {
      if (report?.status === 'pending' || report?.status === 'entered') {
        const payload = buildPayload();
        if (payload.values.length) {
          await api.submitReport(registrationId, { ...payload, verify: canVerifyReports(user) });
        }
      }
      if (canVerifyReports(user)) {
        const data = await api.verifyReport(registrationId);
        setReport(data);
        setMessage('All tests approved and report verified.');
      } else {
        await handleSave(false);
        setMessage('Results saved. Pathologist approval required for verification.');
      }
    } catch (err) {
      setError(err.message || 'Failed to approve results.');
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseReport = async () => {
    await handleSave(canVerifyReports(user));
  };

  const handleReceipt = async () => {
    try {
      const data = await api.getNotificationPrefill(registrationId);
      printBillReceipt(data.bill, data.patient_name, data.lab_code, { show_header: showHeader, show_footer: true });
    } catch (err) {
      setError(err.message || 'Failed to open receipt.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintPreview = () => {
    navigate(`/clinical/report-preview?id=${registrationId}`);
  };

  const patient = report?.patient_details;
  const isVerified = report?.status === 'verified';

  if (!registrationId) {
    return (
      <div className="tre-page">
        <p className="tre-message tre-message--error">Missing registration id.</p>
        <Link to="/search">Back to Search</Link>
      </div>
    );
  }

  return (
    <div className="tre-page">
      <div className="tre-topbar no-print">
        <Link to="/search" className="tre-back">← Back to Search</Link>
      </div>

      {loading && <p className="tre-message">Loading test results…</p>}
      {error && <p className="tre-message tre-message--error">{error}</p>}
      {message && <p className="tre-message tre-message--success">{message}</p>}

      {!loading && report && (
        <>
          <section className="tre-patient-banner">
            <div className="tre-patient-main">
              <strong>{patient?.full_name || report.patient_name}</strong>
              <span className="tre-patient-id">({patient?.lab_code || report.lab_code})</span>
              <span className="tre-patient-age">{patient?.age_display}</span>
            </div>
            <div className="tre-patient-meta">
              <span>Center : {patient?.collection_center}</span>
              <span>Ref Dr. : {patient?.doctor_name}</span>
              <span>Ref : {patient?.affiliation}</span>
            </div>
            <div className="tre-patient-actions no-print">
              <button type="button" onClick={() => navigate('/registration')}>Test Registration</button>
              <button type="button" disabled={!hasPrev} onClick={() => navigateToRegistration(registrationIds[currentIndex - 1])}>&lt;&lt;</button>
              <button type="button" disabled={!hasNext} onClick={() => navigateToRegistration(registrationIds[currentIndex + 1])}>&gt;&gt;</button>
              <button type="button" onClick={() => navigate('/search')}>SMS</button>
            </div>
          </section>

          <section className="tre-toolbar no-print">
            <label>
              Barcode
              <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            </label>
            <label className="tre-check">
              <input type="checkbox" checked={showHeader} onChange={(e) => setShowHeader(e.target.checked)} />
              Show Header
            </label>
            <button type="button">Patient History</button>
            <button type="button" onClick={() => alert('Export will download result data for this visit.')}>Export</button>
            <button type="button" onClick={() => navigate(`/barcode-print?registrationId=${registrationId}`)}>Manage Barcode</button>
            <button type="button" onClick={handlePrint}>Print</button>
          </section>

          <section className="tre-test-select no-print">
            <div className="tre-test-select-title">Test List</div>
            <div className="tre-test-checkboxes">
              {(report.ordered_tests || []).map((test) => (
                <label key={test.id}>
                  <input
                    type="checkbox"
                    checked={selectedTests[test.name] !== false}
                    onChange={(e) => setSelectedTests((prev) => ({ ...prev, [test.name]: e.target.checked }))}
                  />
                  {test.name}
                </label>
              ))}
            </div>
            <div className="tre-test-select-actions">
              <button type="button">Show TRF</button>
              <button type="button">Attachments to Report</button>
            </div>
          </section>

          <section className="tre-results">
            <table className="tre-table">
              <thead>
                <tr>
                  <th>Parameter Name</th>
                  <th>Value</th>
                  <th>Unit</th>
                  <th>Normal Range</th>
                  <th>History</th>
                  <th>Critical Low</th>
                  <th>Critical High</th>
                  <th className="no-print">Cancel Test</th>
                  <th className="no-print">Change Date</th>
                </tr>
              </thead>
              <tbody>
                {visibleGroups.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="tre-empty">
                      No parameters configured for selected tests. Add parameters in Test Parameter Master.
                    </td>
                  </tr>
                ) : (
                  visibleGroups.map(([testName, params]) => (
                    <Fragment key={testName}>
                      <tr className="tre-group-header">
                        <td colSpan={9}>
                          <div className="tre-group-bar no-print">
                            <strong>{testName}</strong>
                            <label className="tre-normal-toggle">
                              Normal
                              <input
                                type="checkbox"
                                checked={testNormal[testName] !== false}
                                onChange={(e) => setTestNormal((prev) => ({ ...prev, [testName]: e.target.checked }))}
                              />
                            </label>
                            <select defaultValue="">
                              <option value="">Pathologist Authoriz</option>
                              <option value="authorized">Authorized</option>
                            </select>
                            <button type="button">Edit Test</button>
                          </div>
                          <strong className="print-only">{testName}</strong>
                        </td>
                      </tr>
                      {params.map((param) => {
                        const value = values[param.id] ?? '';
                        const flag = calculateResultFlag(value, param, report);
                        const refRange = selectReferenceRange(param, report);
                        return (
                          <tr key={param.id} className={isAbnormalFlag(flag) ? 'tre-row-abnormal' : ''}>
                            <td>{param.parameter_name}</td>
                            <td>
                              <input
                                type="text"
                                className="tre-value-input"
                                disabled={isVerified}
                                value={value}
                                onChange={(e) => setValues((prev) => ({ ...prev, [param.id]: e.target.value }))}
                              />
                            </td>
                            <td>{param.unit || '—'}</td>
                            <td>{refRange || '—'}</td>
                            <td>—</td>
                            <td>{param.critical_low ?? '—'}</td>
                            <td>{param.critical_high ?? '—'}</td>
                            <td className="no-print">
                              <button type="button" className="tre-mini-btn" onClick={() => alert(`Cancel test: ${param.parameter_name}`)}>C</button>
                            </td>
                            <td className="no-print">
                              <button type="button" className="tre-mini-btn" onClick={() => alert(`Change date for: ${param.parameter_name}`)}>D</button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="tre-interpretation-row">
                        <td colSpan={9}>
                          <label>Interpretation</label>
                          <textarea
                            value={interpretations[testName] || ''}
                            onChange={(e) => setInterpretations((prev) => ({ ...prev, [testName]: e.target.value }))}
                          />
                          <label>Remark</label>
                          <textarea
                            value={remarks[testName] || ''}
                            onChange={(e) => setRemarks((prev) => ({ ...prev, [testName]: e.target.value }))}
                          />
                        </td>
                      </tr>
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="tre-footer-actions no-print">
            <button type="button" disabled={!hasPrev} onClick={() => navigateToRegistration(registrationIds[currentIndex - 1])}>
              &lt;&lt; Previous Test
            </button>
            <button type="button" onClick={handlePrintPreview}>Print Preview</button>
            <button type="button" disabled={saving || isVerified} onClick={() => handleSave(false)}>Save</button>
            <button type="button" disabled={saving || isVerified} onClick={async () => { await handleSave(false); handlePrint(); }}>
              Save and Print
            </button>
            <button type="button" onClick={handlePrint}>Direct Print</button>
            <button type="button" onClick={handleReceipt}>Receipt</button>
            <button type="button" disabled={saving || isVerified} onClick={handleReleaseReport}>Release Report</button>
            <button type="button" disabled={saving || isVerified} onClick={handleApproveAll}>Approve All</button>
            <button type="button" disabled={!hasNext} onClick={() => navigateToRegistration(registrationIds[currentIndex + 1])}>
              Next Test &gt;&gt;
            </button>
          </section>
        </>
      )}
    </div>
  );
}
