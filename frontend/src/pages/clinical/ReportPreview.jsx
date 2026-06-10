import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { flagClass } from '../../utils/roles';
import '../../styles/clinical.css';

function groupValues(values) {
  const groups = {};
  (values || []).forEach((v) => {
    const key = v.test_name || 'General';
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  });
  return groups;
}

export default function ReportPreview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [labCode, setLabCode] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadByRegistrationId = useCallback(async (registrationId) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getReport(registrationId);
      setReport(data);
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchByLabCode = async () => {
    if (!labCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const rows = await api.searchRegistrations({
        from_labcode: labCode.trim(),
        to_labcode: labCode.trim(),
        status: 'All',
      });
      if (!rows.length) {
        setError('No registration found for this lab code.');
        setReport(null);
        return;
      }
      await loadByRegistrationId(rows[0].id);
      setSearchParams({ id: String(rows[0].id) });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) loadByRegistrationId(Number(id));
  }, [searchParams, loadByRegistrationId]);

  const valueGroups = useMemo(() => groupValues(report?.values), [report]);

  return (
    <Layout activePage="clinical">
      <main className="dash-main">
        <h2 className="page-heading">Report Preview</h2>

        <section className="clinical-panel">
          <div className="clinical-toolbar">
            <div className="form-row">
              <label>Lab Code</label>
              <input
                value={labCode}
                onChange={(e) => setLabCode(e.target.value)}
                placeholder="Enter lab code"
                onKeyDown={(e) => e.key === 'Enter' && searchByLabCode()}
              />
            </div>
            <button type="button" className="btn-blue" onClick={searchByLabCode}>Load Report</button>
          </div>
        </section>

        {loading && <p>Loading report...</p>}
        {error && <p className="login-error">{error}</p>}

        {report && !loading && (
          <section className="clinical-panel">
            <div className="report-header">
              <div>
                <h3>CLASMO DIAGNOSTICS PVT.LTD.</h3>
                <p style={{ margin: '4px 0', color: '#666' }}>Laboratory Report</p>
                <div className="report-meta">
                  <span><strong>Lab Code:</strong> {report.lab_code}</span>
                  <span><strong>Patient:</strong> {report.patient_name}</span>
                  <span><strong>Gender:</strong> {report.patient_gender}</span>
                  <span><strong>Age:</strong> {report.patient_age} Y</span>
                </div>
                {report.entered_by_name && (
                  <div className="report-meta">
                    <span><strong>Entered by:</strong> {report.entered_by_name}</span>
                    {report.verified_by_name && (
                      <span><strong>Verified by:</strong> {report.verified_by_name}</span>
                    )}
                  </div>
                )}
              </div>
              <span className={`status-pill status-${report.status}`}>{report.status}</span>
            </div>

            {!report.values?.length ? (
              <p className="empty-msg">No results entered yet. Use Result Entry to add values.</p>
            ) : (
              Object.entries(valueGroups).map(([testName, items]) => (
                <div key={testName} style={{ marginBottom: 20 }}>
                  <h4 style={{ marginBottom: 8, color: 'var(--blue-deep)' }}>{testName}</h4>
                  <div className="data-table-scroll">
                  <table className="data-table data-table-responsive">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Result</th>
                        <th>Unit</th>
                        <th>Reference</th>
                        <th>Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((v) => (
                        <tr key={v.id || v.parameter}>
                          <td data-label="Parameter">{v.parameter_name}</td>
                          <td data-label="Result"><strong>{v.value}</strong></td>
                          <td data-label="Unit">{v.unit}</td>
                          <td data-label="Reference">{v.reference_range || '—'}</td>
                          <td data-label="Flag">
                            <span className={`flag-badge ${flagClass(v.flag)}`}>{v.flag}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              ))
            )}

            <div style={{ marginTop: 16 }}>
              <button type="button" className="btn-blue" onClick={() => window.print()}>Print Report</button>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </Layout>
  );
}
