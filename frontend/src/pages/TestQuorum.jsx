import { Link } from 'react-router-dom';
import { useState } from 'react';
import clasmoLogo from '../assets/clasmo-logo.png';
import LandingBrandTitle from '../components/landing/LandingBrandTitle';
import { api } from '../services/api';
import '../styles/landing.css';

export default function TestQuorum() {
  const [labCode, setLabCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setReport(null);
    if (!labCode.trim() || !mobile.trim()) {
      setError('Please enter your lab code and registered mobile number.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.getPublicPatientReport({
        lab_code: labCode.trim(),
        mobile: mobile.trim(),
      });
      setReport(data);
    } catch (err) {
      setError(err.message || 'Unable to fetch report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const details = report?.patient_details;

  return (
    <div className="landing-page landing-sketch quorum-page">
      <header className="landing-sketch-header quorum-no-print">
        <Link to="/">
          <img src={clasmoLogo} alt="Clasmo Diagnostics logo" className="landing-sketch-logo" />
        </Link>
        <LandingBrandTitle />
        <Link to="/" className="landing-nav-link quorum-back-link">← Back to Home</Link>
      </header>
      <hr className="landing-sketch-rule quorum-no-print" />

      <section className="quorum-lookup quorum-no-print">
        <h2 className="landing-plain-heading">TEST QUORUM — VIEW YOUR REPORT</h2>
        <form className="quorum-lookup-form" onSubmit={handleSubmit}>
          <label>
            Lab Code
            <input
              type="text"
              value={labCode}
              onChange={(event) => setLabCode(event.target.value)}
              placeholder="e.g. 202505001"
            />
          </label>
          <label>
            Registered Mobile Number
            <input
              type="tel"
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
              placeholder="10-digit mobile number"
            />
          </label>
          <button type="submit" className="btn-landing-login landing-login-big" disabled={loading}>
            {loading ? 'SEARCHING…' : 'VIEW REPORT'}
          </button>
        </form>
        {error && <p className="landing-join-error quorum-error">{error}</p>}
      </section>

      {report && (
        <section className="quorum-report">
          <div className="quorum-report-head">
            <img src={clasmoLogo} alt="Clasmo Diagnostics logo" />
            <div>
              <h2>CLASMO DIAGNOSTICS PVT LTD</h2>
              <p>Where Accuracy Saves Lives</p>
            </div>
          </div>

          <div className="quorum-patient-grid">
            <p><span>Patient:</span> {details.full_name}</p>
            <p><span>Lab Code:</span> {report.lab_code}</p>
            <p><span>Age / Sex:</span> {details.age_display}</p>
            <p><span>Mobile:</span> {details.mobile || '-'}</p>
            <p><span>Referred By:</span> {details.doctor_name}</p>
            <p><span>Registered:</span> {details.registration_date}</p>
            <p><span>Collection Center:</span> {details.collection_center}</p>
            <p><span>Reported:</span> {report.reported_at}</p>
          </div>

          {report.tests.map((test) => (
            <div key={test.test_name} className="quorum-test-block">
              <h3>{test.test_name}</h3>
              <table className="quorum-report-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Result</th>
                    <th>Unit</th>
                    <th>Reference Range</th>
                    <th>Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {test.rows.map((row) => (
                    <tr key={row.id} className={row.flag !== 'Normal' ? 'quorum-flag-abnormal' : ''}>
                      <td>{row.parameter_name}</td>
                      <td>{row.value}</td>
                      <td>{row.unit || '-'}</td>
                      <td>{row.reference_range || '-'}</td>
                      <td>{row.flag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="quorum-report-footer">
            <p>
              Verified by: <strong>{report.verified_by || 'Pathologist'}</strong>
            </p>
            <p className="quorum-end-note">--- End of Report ---</p>
          </div>

          <div className="quorum-actions quorum-no-print">
            <button type="button" className="btn-landing-login landing-login-big" onClick={() => window.print()}>
              DOWNLOAD / PRINT PDF
            </button>
          </div>
        </section>
      )}

    </div>
  );
}
