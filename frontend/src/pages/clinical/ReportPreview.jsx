import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import ClasmoReportSheet, { printClasmoReport } from '../../components/reports/ClasmoReportSheet';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { FRANCHISE_ROLES, canVerifyReports, flagClass } from '../../utils/roles';
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

function narrativeForTest(report, testName, sampleItem) {
  const ordered = (report?.ordered_tests || []).find(
    (t) => (t.name || '').toLowerCase() === String(testName || '').toLowerCase(),
  );
  return {
    sampleType: sampleItem?.sample_type || ordered?.sample_type || 'General',
    reportNote: ordered?.report_note || sampleItem?.report_note || '',
    reportComments: ordered?.report_comments || sampleItem?.report_comments || '',
    clinicalSignificance: ordered?.clinical_significance || sampleItem?.clinical_significance || '',
    reportExtraSections: ordered?.report_extra_sections || sampleItem?.report_extra_sections || null,
  };
}

export default function ReportPreview() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [labCode, setLabCode] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isFranchise = FRANCHISE_ROLES.includes(user?.role);
  const canVerify = canVerifyReports(user);

  const loadByRegistrationId = useCallback(async (registrationId) => {
    setLoading(true);
    setError('');
    setMessage('');
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
  const isVerified = report?.status === 'verified';
  const isEntered = report?.status === 'entered';
  const franchiseBlocked = isFranchise && report && !isVerified;
  const registrationId = report?.registration || Number(searchParams.get('id')) || null;

  const demographics = useMemo(() => {
    if (!report) return {};
    const details = report.patient_details || {};
    const age = details.age_display
      || (report.patient_age != null
        ? `${report.patient_age} Y / ${(report.patient_gender || '').slice(0, 1).toUpperCase() || '—'}`
        : '');
    return {
      patient_name: details.full_name || details.patient_name || report.patient_name || '',
      age_gender: age,
      doctor_name: details.doctor_name || '',
      lab_code: details.lab_code || report.lab_code || '',
      barcode: details.barcode || report.lab_code || '',
      registration_date: details.registration_date || '',
      reported_on: isVerified ? (details.reported_on || report.updated_at || '') : '',
      sample_collected_at: details.collection_center || '',
    };
  }, [report, isVerified]);

  const handleVerify = async () => {
    if (!registrationId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await api.verifyReport(registrationId);
      setReport(data);
      setMessage('Report approved. Final report is now available to the franchisee.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async ({ markPrinted = false } = {}) => {
    setPrinting(true);
    setError('');
    try {
      await printClasmoReport();
      if (markPrinted && registrationId && isVerified) {
        const data = await api.markReportPrinted(registrationId);
        setReport(data);
        setMessage('Report printed and marked as Printed / Released.');
      }
    } catch (err) {
      setError(err.message || 'Print failed.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Layout activePage="clinical">
      <main className="dash-main">
        <h2 className="page-heading no-print">Report Preview</h2>

        {!isFranchise && (
          <section className="clinical-panel no-print">
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
              <Link to="/sample-scan" className="btn-outline">Scan Barcode</Link>
            </div>
          </section>
        )}

        {loading && <p className="no-print">Loading report...</p>}
        {error && <p className="login-error no-print">{error}</p>}
        {message && <p className="clinical-success-msg no-print">{message}</p>}

        {franchiseBlocked && (
          <section className="clinical-panel no-print">
            <p className="empty-msg">
              This report is not yet released. Status: <strong>{report.status}</strong>.
              The final report becomes available after pathologist cross-verification.
            </p>
            <p className="portfolio-intro">
              Lab code: {report.lab_code} · Patient: {report.patient_name}
            </p>
          </section>
        )}

        {report && !loading && !franchiseBlocked && (
          <section className="clinical-panel">
            <div className="report-preview-status no-print" style={{ marginBottom: 12 }}>
              <span className={`status-pill status-${report.status}`}>{report.status}</span>
              {report.registration_status && (
                <span className="status-pill" style={{ marginLeft: 8 }}>
                  Reg: {report.registration_status}
                </span>
              )}
              {report.entered_by_name && (
                <span style={{ marginLeft: 10, fontSize: 13, color: '#555' }}>
                  Entered by: {report.entered_by_name}
                  {report.verified_by_name ? ` · Verified by: ${report.verified_by_name}` : ''}
                </span>
              )}
            </div>

            {!report.values?.length ? (
              <p className="empty-msg no-print">
                No results entered yet.
                {canVerifyReports(user) ? ' Ask the technician to submit machine readings.' : ' Use Result Entry after scanning the barcode.'}
              </p>
            ) : (
              <div className="print-clasmo-reports-root">
                {Object.entries(valueGroups).map(([testName, items]) => {
                  const narrative = narrativeForTest(report, testName, items[0]);
                  return (
                    <div key={testName} style={{ marginBottom: 20 }}>
                      <ClasmoReportSheet
                        title={testName}
                        sampleType={narrative.sampleType}
                        demographics={demographics}
                        rows={items.map((v) => ({
                          id: v.id || v.parameter,
                          parameter_name: v.parameter_name,
                          result: v.value,
                          unit: v.unit,
                          reference_range: v.reference_range,
                          method: v.method,
                          flag: v.flag,
                          source: v.source,
                        }))}
                        isLive
                        isSample={false}
                        showReferenceColumn={false}
                        reportNote={narrative.reportNote}
                        reportComments={narrative.reportComments}
                        clinicalSignificance={narrative.clinicalSignificance}
                        reportExtraSections={narrative.reportExtraSections}
                        footerNote={
                          isVerified
                            ? 'Official Clasmo letterhead final report.'
                            : 'Draft on official Clasmo letterhead — approve after pathologist review.'
                        }
                        actions={null}
                      />
                      <div className="no-print" style={{ marginTop: 8, fontSize: 12, color: '#667' }}>
                        {items.map((v) => (
                          <span key={v.id || v.parameter} style={{ marginRight: 10 }}>
                            {v.parameter_name}: <span className={`flag-badge ${flagClass(v.flag)}`}>{v.flag}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="report-preview-actions no-print">
              {canVerify && isEntered && !isVerified && (
                <button type="button" className="btn-blue" disabled={saving} onClick={handleVerify}>
                  {saving ? 'Approving…' : 'Cross-verify & Approve Final Report'}
                </button>
              )}
              {isVerified && (
                <button
                  type="button"
                  className="btn-blue"
                  disabled={printing}
                  onClick={() => handlePrint({ markPrinted: true })}
                >
                  {printing ? 'Printing…' : 'Print Final Report'}
                </button>
              )}
              {!isVerified && report.values?.length > 0 && (
                <button
                  type="button"
                  className="btn-outline"
                  disabled={printing}
                  onClick={() => handlePrint({ markPrinted: false })}
                >
                  Print Draft
                </button>
              )}
              {canVerify && (
                <Link
                  to={`/clinical/result-entry?registrationId=${registrationId}`}
                  className="btn-outline"
                >
                  Open Entry Sheet
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
