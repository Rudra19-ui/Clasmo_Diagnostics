import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { canVerifyReports, flagClass } from '../../utils/roles';
import { formatDate } from '../../utils/date';
import '../../styles/clinical.css';

function groupParameters(parameters) {
  const groups = {};
  parameters.forEach((p) => {
    const key = p.test_name || `Test ${p.test}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  return groups;
}

export default function ResultEntry() {
  const { user } = useAuth();
  const [labCode, setLabCode] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [report, setReport] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const searchRegs = useCallback(async () => {
    setError('');
    try {
      const data = await api.searchRegistrations({
        patient_name: '',
        from_date: '',
        to_date: '',
        from_labcode: labCode,
        to_labcode: labCode,
        status: 'All',
      });
      setRegistrations(data);
    } catch (err) {
      setError(err.message);
    }
  }, [labCode]);

  const loadReport = useCallback(async (registrationId) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getReport(registrationId);
      setReport(data);
      setSelectedId(registrationId);
      const initial = {};
      (data.values || []).forEach((v) => {
        initial[v.parameter] = v.value;
      });
      (data.parameters || []).forEach((p) => {
        if (initial[p.id] === undefined) initial[p.id] = '';
      });
      setValues(initial);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    searchRegs();
  }, []);

  const parameterGroups = useMemo(
    () => groupParameters(report?.parameters || []),
    [report],
  );

  const handleSave = async (verify = false) => {
    if (!selectedId) return;
    setSaving(true);
    setError('');
    setMessage('');
    const payload = {
      values: Object.entries(values)
        .filter(([, v]) => v !== '')
        .map(([parameter_id, value]) => ({
          parameter_id: Number(parameter_id),
          value: String(value),
        })),
      verify,
    };
    if (!payload.values.length) {
      setError('Enter at least one result value.');
      setSaving(false);
      return;
    }
    try {
      const data = await api.submitReport(selectedId, payload);
      setReport(data);
      setMessage(verify ? 'Results saved and verified.' : 'Results saved successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError('');
    try {
      const data = await api.verifyReport(selectedId);
      setReport(data);
      setMessage('Report verified by pathologist.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isVerified = report?.status === 'verified';

  return (
    <Layout activePage="clinical">
      <main className="dash-main">
        <h2 className="page-heading">Result Entry</h2>

        <section className="clinical-panel">
          <div className="clinical-toolbar">
            <div className="form-row">
              <label>Lab Code</label>
              <input value={labCode} onChange={(e) => setLabCode(e.target.value)} placeholder="e.g. 270526041" />
            </div>
            <button type="button" className="btn-blue" onClick={searchRegs}>Search</button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Lab Code</th>
                <th>Patient</th>
                <th>Test</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!registrations.length ? (
                <tr><td colSpan="6" className="empty-msg">Search for a registration to enter results.</td></tr>
              ) : registrations.map((r) => (
                <tr key={r.id} className={selectedId === r.id ? 'active' : ''}>
                  <td>{r.lab_code}</td>
                  <td>{r.patient_name}</td>
                  <td>{r.test}</td>
                  <td>{r.date}</td>
                  <td><span className="badge-status">{r.status}</span></td>
                  <td>
                    <button type="button" className="btn-link" onClick={() => loadReport(r.id)}>
                      Enter Results
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {loading && <p>Loading report data...</p>}
        {error && <p className="login-error">{error}</p>}
        {message && <p style={{ color: '#2e7d32' }}>{message}</p>}

        {report && !loading && (
          <section className="clinical-panel">
            <div className="report-header">
              <div>
                <h3>{report.lab_code || report.patient_name} — {report.patient_name}</h3>
                <div className="report-meta">
                  <span>Gender: {report.patient_gender}</span>
                  <span>Age: {report.patient_age} Y</span>
                  <span>Date: {formatDate()}</span>
                </div>
              </div>
              <span className={`status-pill status-${report.status}`}>{report.status}</span>
            </div>

            {!report.parameters?.length ? (
              <p className="empty-msg">No parameters configured for the ordered tests. Add parameters in Test Parameter Master.</p>
            ) : (
              <table className="data-table result-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Unit</th>
                    <th>Reference Range</th>
                    <th>Result</th>
                    <th>Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(parameterGroups).map(([testName, params]) => (
                    <Fragment key={testName}>
                      <tr className="test-group-heading">
                        <td colSpan="5">{testName}</td>
                      </tr>
                      {params.map((p) => {
                        const existing = report.values?.find((v) => v.parameter === p.id);
                        const isChild = report.patient_age > 0 && report.patient_age < 18;
                        const ref = isChild
                          ? p.reference_range_child || p.reference_range_male
                          : report.patient_gender === 'female'
                            ? p.reference_range_female || p.reference_range_male
                            : p.reference_range_male;
                        return (
                          <tr key={p.id} className={existing?.flag === 'Critical' ? 'value-critical' : ''}>
                            <td>{p.parameter_name}</td>
                            <td>{p.unit}</td>
                            <td>{ref || '—'}</td>
                            <td>
                              <input
                                type="text"
                                disabled={isVerified}
                                value={values[p.id] ?? ''}
                                onChange={(e) => setValues({ ...values, [p.id]: e.target.value })}
                              />
                            </td>
                            <td>
                              {existing && (
                                <span className={`flag-badge ${flagClass(existing.flag)}`}>{existing.flag}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!isVerified && (
                <button type="button" className="btn-blue" disabled={saving} onClick={() => handleSave(false)}>
                  {saving ? 'Saving...' : 'Save Results'}
                </button>
              )}
              {!isVerified && canVerifyReports(user) && report.status === 'entered' && (
                <button type="button" className="btn-outline" disabled={saving} onClick={handleVerify}>
                  Verify Report
                </button>
              )}
              {selectedId && (
                <Link to={`/clinical/report-preview?id=${selectedId}`} className="btn-link">
                  Preview Report →
                </Link>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </Layout>
  );
}
