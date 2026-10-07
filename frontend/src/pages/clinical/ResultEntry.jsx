import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import ClasmoReportSheet from '../../components/reports/ClasmoReportSheet';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { canEnterResults, canVerifyReports } from '../../utils/roles';
import '../../styles/clinical.css';

function groupParameters(parameters) {
  const groups = {};
  (parameters || []).forEach((p) => {
    const key = p.test_name || `Test ${p.test}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  return groups;
}

export default function ResultEntry() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [labCode, setLabCode] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [report, setReport] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const canEnter = canEnterResults(user);
  const canVerify = canVerifyReports(user);

  const loadReport = useCallback(async (registrationId) => {
    setLoading(true);
    setError('');
    setMessage('');
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
      setSearchParams({ registrationId: String(registrationId) }, { replace: true });
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

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
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }, [labCode]);

  useEffect(() => {
    const fromUrl = searchParams.get('registrationId');
    if (fromUrl) {
      loadReport(Number(fromUrl));
      return;
    }
    searchRegs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const parameterGroups = useMemo(
    () => groupParameters(report?.parameters || []),
    [report],
  );

  const details = report?.patient_details || {};
  const isVerified = report?.status === 'verified';
  const isEntered = report?.status === 'entered';

  const handleSave = async () => {
    if (!selectedId || !(canEnter || canVerify)) return;
    setSaving(true);
    setError('');
    setMessage('');
    const payload = {
      values: Object.entries(values)
        .filter(([, v]) => String(v).trim() !== '')
        .map(([parameter_id, value]) => ({
          parameter_id: Number(parameter_id),
          value: String(value),
        })),
      verify: false,
    };
    if (!payload.values.length) {
      setError('Enter at least one machine reading in the result placeholders.');
      setSaving(false);
      return;
    }
    try {
      const data = await api.submitReport(selectedId, payload);
      setReport(data);
      setMessage('Machine readings saved. Report sent for pathologist cross-verification.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedId || !canVerify) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      // Persist any edits pathologist made before approve
      if (canEnter || canVerify) {
        const payload = {
          values: Object.entries(values)
            .filter(([, v]) => String(v).trim() !== '')
            .map(([parameter_id, value]) => ({
              parameter_id: Number(parameter_id),
              value: String(value),
            })),
          verify: false,
        };
        if (payload.values.length && report?.status !== 'verified') {
          await api.submitReport(selectedId, payload);
        }
      }
      const data = await api.verifyReport(selectedId);
      setReport(data);
      setMessage('Report approved. Final report is now available to the franchisee.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout activePage="clinical">
      <main className="dash-main">
        <h2 className="page-heading">
          {canEnter && !canVerify ? 'Machine Result Entry' : 'Result Entry & Verification'}
        </h2>
        <p className="portfolio-intro">
          Patient details are filled from the booking. Enter machine readings in the empty result fields,
          submit for pathologist review, then approve to release the final report to the franchisee.
        </p>

        {!searchParams.get('registrationId') && (
          <section className="clinical-panel no-print">
            <div className="clinical-toolbar">
              <div className="form-row">
                <label>Lab Code</label>
                <input
                  value={labCode}
                  onChange={(e) => setLabCode(e.target.value)}
                  placeholder="e.g. 270526041"
                  onKeyDown={(e) => e.key === 'Enter' && searchRegs()}
                />
              </div>
              <button type="button" className="btn-blue" onClick={searchRegs}>Search</button>
              <Link to="/sample-scan" className="btn-outline">Scan Barcode</Link>
            </div>

            <div className="data-table-scroll">
              <table className="data-table data-table-responsive">
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
                    <tr>
                      <td colSpan="6" className="empty-msg" data-label="">
                        Search by lab code, or scan a sample barcode to open this report format.
                      </td>
                    </tr>
                  ) : registrations.map((r) => (
                    <tr key={r.id} className={selectedId === r.id ? 'active' : ''}>
                      <td data-label="Lab Code">{r.lab_code}</td>
                      <td data-label="Patient">{r.patient_name}</td>
                      <td data-label="Test">{r.test}</td>
                      <td data-label="Date">{r.date}</td>
                      <td data-label="Status">
                        <span className="badge-status">
                          {r.report_status ? `${r.report_status} · ${r.status}` : r.status}
                        </span>
                      </td>
                      <td data-label="Action">
                        <button type="button" className="btn-link" onClick={() => loadReport(r.id)}>
                          Open Report Format
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {loading && <p>Loading report format…</p>}
        {error && <p className="login-error">{error}</p>}
        {message && <p className="clinical-success-msg">{message}</p>}

        {report && !loading && (
          <section className="clinical-panel machine-report-panel">
            <p className="page-sub no-print" style={{ marginBottom: 12 }}>
              Status: <span className={`status-pill status-${report.status}`}>{report.status}</span>
              {' · '}
              {isVerified ? 'FINAL REPORT' : isEntered ? 'AWAITING PATHOLOGIST' : 'MACHINE ENTRY'}
              {report.entered_by_name ? ` · Entered by ${report.entered_by_name}` : ''}
              {report.verified_by_name ? ` · Verified by ${report.verified_by_name}` : ''}
            </p>

            {!report.parameters?.length ? (
              <p className="empty-msg">
                No parameters configured for the ordered tests. Add them in Test Parameter Master / Parameter Import.
              </p>
            ) : (
              <div className="print-clasmo-reports-root">
                {Object.entries(parameterGroups).map(([testName, params], index) => {
                  const sheetRows = params.map((p) => {
                    const existing = report.values?.find((v) => v.parameter === p.id);
                    return {
                      ...p,
                      result: values[p.id] || existing?.value || '',
                      flag: existing?.flag || '',
                      reference_range_male: p.reference_range_male,
                      reference_range_female: p.reference_range_female,
                      reference_range_child: p.reference_range_child,
                    };
                  });
                  const meta = params[0] || {};
                  const ordered = (report.ordered_tests || []).find(
                    (t) => (t.name || '').toLowerCase() === String(testName || '').toLowerCase(),
                  );
                  const sampleType = meta.sample_type || ordered?.sample_type || details.sample_type || 'General';
                  const editable = (canEnter || canVerify) && !isVerified;
                  return (
                    <div key={testName} style={{ marginBottom: 16 }}>
                      <ClasmoReportSheet
                        title={testName}
                        sampleType={sampleType}
                        demographics={{
                          patient_name: details.full_name || report.patient_name || '',
                          age_gender: details.age_display || `${report.patient_age || ''} Y / ${report.patient_gender || ''}`,
                          doctor_name: details.doctor_name || '',
                          lab_code: report.lab_code || '',
                          barcode: details.barcode || '',
                          registration_date: details.registration_date || '',
                          reported_on: isVerified ? (details.reported_on || '') : '',
                          sample_collected_at: details.collection_center || '',
                        }}
                        rows={sheetRows}
                        isLive
                        isSample={false}
                        editable={editable}
                        values={values}
                        onValueChange={(paramId, value) => setValues((prev) => ({ ...prev, [paramId]: value }))}
                        reportNote={ordered?.report_note || meta.report_note || ''}
                        reportComments={ordered?.report_comments || meta.report_comments || ''}
                        clinicalSignificance={ordered?.clinical_significance || meta.clinical_significance || ''}
                        reportExtraSections={ordered?.report_extra_sections || meta.report_extra_sections || null}
                        footerNote={
                          index === Object.keys(parameterGroups).length - 1
                            ? (isVerified
                              ? 'This final report is approved and available to the franchisee account.'
                              : isEntered
                                ? 'Machine readings submitted. Pathologist must cross-verify and approve before franchisee access.'
                                : 'Same Clasmo letterhead as Sample Report. Enter machine readings in the result placeholders.')
                            : ''
                        }
                        actions={index === Object.keys(parameterGroups).length - 1 ? (
                          <>
                            {canEnter && !isVerified && (
                              <button type="button" className="sample-report-btn" disabled={saving} onClick={handleSave}>
                                {saving ? 'Saving…' : 'Submit for Pathologist Review'}
                              </button>
                            )}
                            {!canEnter && canVerify && !isVerified && (
                              <button type="button" className="sample-report-btn" disabled={saving} onClick={handleSave}>
                                {saving ? 'Saving…' : 'Save Corrections'}
                              </button>
                            )}
                            {canVerify && !isVerified && (
                              <button type="button" className="sample-report-btn" disabled={saving} onClick={handleVerify}>
                                {saving ? 'Approving…' : 'Cross-verify & Approve Final Report'}
                              </button>
                            )}
                            {selectedId && (
                              <Link
                                to={`/clinical/report-preview?id=${selectedId}`}
                                className="sample-report-btn sample-report-btn--secondary"
                              >
                                Open Final Preview
                              </Link>
                            )}
                            <Link to="/sample-scan" className="sample-report-btn sample-report-btn--secondary">
                              Scan Another
                            </Link>
                          </>
                        ) : null}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </Layout>
  );
}
