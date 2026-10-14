import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { getReportSectionPaths } from '../../utils/reportSection';

function referenceFor(parameter, patient) {
  const years = Number(patient?.age_years) || 0;
  if (years > 0 && years < 18 && parameter.reference_range_child) {
    return parameter.reference_range_child;
  }
  if (patient?.gender === 'female' && parameter.reference_range_female) {
    return parameter.reference_range_female;
  }
  return parameter.reference_range_male
    || parameter.reference_range_female
    || parameter.reference_range_child
    || '';
}

function testsFromRegistration(registration) {
  const source = Array.isArray(registration?.tests) ? registration.tests : [];
  return source
    .filter((item) => item?.test && item?.test_name)
    .map((item) => ({
      id: item.test,
      name: item.test_name,
      sampleType: item.sample_type || '',
    }));
}

export default function TechnicianManualEntry() {
  const { labCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const reportPaths = getReportSectionPaths(location.pathname);
  const seeded = location.state?.registration?.lab_code === labCode
    ? location.state.registration
    : null;
  const [registration, setRegistration] = useState(seeded);
  const [report, setReport] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(!seeded);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const registrationRef = useRef(registration);
  registrationRef.current = registration;

  useEffect(() => {
    let cancelled = false;
    api.getRegistration(labCode)
      .then((data) => {
        if (!cancelled) setRegistration(data);
      })
      .catch((err) => {
        if (!cancelled && !registrationRef.current) {
          setError(err.message || 'Could not open this booking.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBooking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [labCode]);

  useEffect(() => {
    if (!registration?.id) return undefined;
    const current = registrationRef.current;
    let cancelled = false;
    setLoadingReport(true);
    setReport(null);
    setSelectedTestId(null);
    api.getReport(current.id)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        const next = {};
        (data.values || []).forEach((item) => {
          next[item.parameter] = item.value || '';
        });
        setValues(next);
        const ordered = testsFromRegistration(current);
        if (ordered.length === 1) setSelectedTestId(ordered[0].id);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load test parameters.');
      })
      .finally(() => {
        if (!cancelled) setLoadingReport(false);
      });
    return () => {
      cancelled = true;
    };
  }, [registration?.id]);

  const tests = useMemo(() => testsFromRegistration(registration), [registration]);
  const patient = registration?.patient;
  const patientLabel = registration?.patient_display || registration?.patient_name || 'Patient';
  const parameters = useMemo(() => {
    if (!selectedTestId || !report) return [];
    return (report.parameters || [])
      .filter((item) => item.test === selectedTestId && item.is_active !== false)
      .slice()
      .sort((left, right) => (
        (left.sort_order || 0) - (right.sort_order || 0)
        || String(left.parameter_name).localeCompare(String(right.parameter_name))
      ));
  }, [report, selectedTestId]);
  const selectedTest = tests.find((item) => item.id === selectedTestId) || null;
  const verified = report?.status === 'verified';

  async function handleSubmit(event) {
    event.preventDefault();
    if (!registration || verified || !parameters.length) return;
    const payloadValues = parameters
      .map((parameter) => ({
        parameter_id: parameter.id,
        value: String(values[parameter.id] ?? '').trim(),
      }))
      .filter((item) => item.value !== '');
    if (!payloadValues.length) {
      setError('Enter at least one result before submitting.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await api.submitReport(registration.id, {
        values: payloadValues,
        verify: false,
      });
      setReport(saved);
      const next = {};
      (saved.values || []).forEach((item) => {
        next[item.parameter] = item.value || '';
      });
      setValues(next);
      setMessage('Results saved.');
    } catch (err) {
      setError(err.message || 'Could not save results.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout activePage={reportPaths.activePage}>
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li><Link to={reportPaths.all}>All Reports</Link></li>
              <li>Enter results</li>
            </ul>
          </nav>
          <h2 className="page-heading">Enter results</h2>
          <p className="portfolio-intro">
            {registration
              ? `${patientLabel} · Booking ${registration.lab_code}${registration.barcodes ? ` · Barcode ${registration.barcodes}` : ''}`
              : `Booking ${labCode}`}
          </p>
        </header>

        <section className="franchise-module-panel manual-entry-panel" aria-label="Manual result entry">
          <div className="manual-entry-header">
            <h3>Tests for this patient</h3>
            <button type="button" className="btn-outline" onClick={() => navigate(reportPaths.all)}>
              Back to All Reports
            </button>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}
          {message && <p className="manual-entry-success" role="status">{message}</p>}
          {loadingBooking && !registration && <p className="portfolio-intro">Opening booking…</p>}

          {registration && tests.length === 0 && !loadingBooking && (
            <p className="portfolio-intro">This booking has no tests.</p>
          )}

          {tests.length > 0 && (
            <ul className="manual-entry-tests">
              {tests.map((test) => (
                <li key={test.id}>
                  <button
                    type="button"
                    className={test.id === selectedTestId ? 'is-active' : ''}
                    aria-pressed={test.id === selectedTestId}
                    onClick={() => {
                      setSelectedTestId(test.id);
                      setMessage('');
                      setError('');
                    }}
                  >
                    <strong>{test.name}</strong>
                    {test.sampleType ? <span>{test.sampleType}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedTest && (
            <form className="manual-entry-form" onSubmit={handleSubmit}>
              <h4>{selectedTest.name}</h4>
              {loadingReport && <p className="portfolio-intro">Loading parameters…</p>}
              {!loadingReport && verified && (
                <p className="portfolio-intro">This report is verified and can no longer be edited.</p>
              )}
              {!loadingReport && parameters.length === 0 && (
                <p className="portfolio-intro">This test has no parameters set up yet.</p>
              )}
              {parameters.length > 0 && (
                <table className="manual-entry-table">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Method</th>
                      <th>Unit</th>
                      <th>Reference range</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parameters.map((parameter) => (
                      <tr key={parameter.id}>
                        <td>{parameter.parameter_name}</td>
                        <td>{parameter.method || '—'}</td>
                        <td>{parameter.unit || '—'}</td>
                        <td>{referenceFor(parameter, patient) || '—'}</td>
                        <td>
                          <input
                            type="text"
                            value={values[parameter.id] ?? ''}
                            disabled={verified || saving}
                            aria-label={`Result for ${parameter.parameter_name}`}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setValues((current) => ({
                                ...current,
                                [parameter.id]: nextValue,
                              }));
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {parameters.length > 0 && !verified && (
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Submit results'}
                </button>
              )}
            </form>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
