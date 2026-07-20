import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import LandingBrandTitle from '../components/landing/LandingBrandTitle';
import { api } from '../services/api';
import '../styles/landing.css';

export default function TestQuorum() {
  const cameraInputRef = useRef(null);
  const [testName, setTestName] = useState('');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!testName.trim()) {
      setError('Please enter the test name.');
      return;
    }
    if (!photoFile) {
      setError('Please take or upload a photo.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('test_name', testName.trim());
      formData.append('description', description.trim());
      formData.append('photo', photoFile);
      await api.submitSelfPatientQuery(formData);
      setSubmitted(true);
      setTestName('');
      setDescription('');
      setPhotoFile(null);
      setPhotoPreview('');
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.message || 'Unable to submit query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page landing-sketch quorum-page">
      <div className="landing-sketch-topbar quorum-no-print">
        <Link to="/" className="landing-nav-link signin-back-link">← Back to Home</Link>
      </div>
      <header className="landing-sketch-header landing-sketch-header--toolbar quorum-no-print">
        <LandingBrandTitle showLogo />
        <span className="landing-iso-badge" title="ISO Certified">ISO<br />logo</span>
      </header>
      <hr className="landing-sketch-rule quorum-no-print" />

      <section className="quorum-lookup quorum-no-print">
        <h2 className="landing-plain-heading">TEST QUORUM — SELF PATIENT QUERY</h2>
        <p className="quorum-query-intro">
          Enter your test name, add a description, take a photo, and submit. Your query will appear in Self Patient Query for the lab team.
        </p>

        {submitted ? (
          <div className="quorum-query-success">
            <p>Your query has been submitted successfully.</p>
            <button
              type="button"
              className="btn-landing-login landing-login-big"
              onClick={() => setSubmitted(false)}
            >
              SUBMIT ANOTHER QUERY
            </button>
          </div>
        ) : (
          <form className="quorum-query-form" onSubmit={handleSubmit}>
            <label>
              Test Name *
              <input
                type="text"
                value={testName}
                onChange={(event) => setTestName(event.target.value)}
                placeholder="Enter test name"
                required
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe your query or concern"
              />
            </label>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="quorum-camera-input"
              onChange={handlePhotoChange}
            />

            <div className="quorum-camera-row">
              <button type="button" className="btn-landing-login quorum-camera-btn" onClick={openCamera}>
                OPEN CAMERA / TAKE PHOTO
              </button>
              {photoPreview && (
                <img src={photoPreview} alt="Selected query photo" className="quorum-photo-preview" />
              )}
            </div>

            <button type="submit" className="btn-landing-login landing-login-big" disabled={loading}>
              {loading ? 'UPLOADING…' : 'SUBMIT QUERY'}
            </button>
          </form>
        )}

        {error && <p className="landing-join-error quorum-error">{error}</p>}
      </section>
    </div>
  );
}
