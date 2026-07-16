import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import clasmoLogo from '../assets/clasmo-logo.png';
import DepartmentGrid from '../components/landing/DepartmentGrid';
import { api } from '../services/api';
import '../styles/landing.css';

const BRANCHES = ['MUMBAI', 'PUNE', 'NASHIK', 'DHULE', 'RATNAGIRI'];

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  organization: '',
  city: '',
  message: '',
};

export default function Landing() {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef(null);

  const openForm = (event) => {
    event.preventDefault();
    setFormOpen(true);
    setSubmitted(false);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const setField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!form.phone.trim()) {
      setError('Please enter your contact number.');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitJoinRequest({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        organization: form.organization.trim(),
        city: form.city.trim(),
        message: form.message.trim(),
      });
      setSubmitted(true);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-page landing-sketch">
      <header className="landing-sketch-header">
        <img src={clasmoLogo} alt="Clasmo Diagnostics logo" className="landing-sketch-logo" />
        <h1 className="landing-sketch-brand">CLASMO DIAGNOSTICS PVT LTD</h1>
        <span className="landing-iso-badge" title="ISO Certified">ISO<br />logo</span>
      </header>

      <p className="landing-sketch-tagline">Where Accuracy Saves Lives</p>
      <hr className="landing-sketch-rule" />

      <section className="landing-sketch-actions">
        <Link to="/test-quorum" className="btn-test-quorum">★ TEST QUORUM</Link>
        <Link to="/login" className="btn-landing-login landing-login-big">LOG IN</Link>
      </section>

      <section id="branches" className="landing-section landing-branches">
        <h2 className="landing-plain-heading">OUR BRANCHES</h2>
        <ul className="landing-branches-row">
          {BRANCHES.map((city) => (
            <li key={city}>{city}</li>
          ))}
        </ul>
      </section>

      <section id="expertise" className="landing-section landing-expertise">
        <h2 className="landing-plain-heading">OUR EXPERTISE</h2>
        <DepartmentGrid />
      </section>

      <a href="#join-form" className="landing-join-band" onClick={openForm}>
        <span>Come and Join With Clasmo</span>
        <span aria-hidden="true">→</span>
      </a>

      {formOpen && (
        <section id="join-form" ref={formRef} className="landing-join-form-section">
          <div className="landing-join-form-card">
            <h2 className="landing-plain-heading">JOIN WITH CLASMO</h2>
            {submitted ? (
              <div className="landing-join-success">
                <p>Thank you! Your details have been submitted.</p>
                <p>Our team will contact you soon.</p>
              </div>
            ) : (
              <form className="landing-join-form" onSubmit={handleSubmit}>
                <div className="landing-join-form-grid">
                  <label>
                    Name *
                    <input
                      type="text"
                      value={form.name}
                      onChange={setField('name')}
                      placeholder="Your full name"
                      required
                    />
                  </label>
                  <label>
                    Contact Number *
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={setField('phone')}
                      placeholder="Mobile / phone number"
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={form.email}
                      onChange={setField('email')}
                      placeholder="you@example.com"
                    />
                  </label>
                  <label>
                    Lab / Organization
                    <input
                      type="text"
                      value={form.organization}
                      onChange={setField('organization')}
                      placeholder="Lab or organization name"
                    />
                  </label>
                  <label>
                    City
                    <input
                      type="text"
                      value={form.city}
                      onChange={setField('city')}
                      placeholder="Your city"
                    />
                  </label>
                </div>
                <label className="landing-join-form-message">
                  Message
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={setField('message')}
                    placeholder="Tell us how we can help you"
                  />
                </label>
                {error && <p className="landing-join-error">{error}</p>}
                <div className="landing-join-form-actions">
                  <button type="submit" className="btn-landing-login landing-login-big" disabled={submitting}>
                    {submitting ? 'SUBMITTING…' : 'SUBMIT'}
                  </button>
                  <button
                    type="button"
                    className="landing-join-cancel"
                    onClick={() => setFormOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      )}

      <footer id="contact" className="landing-footer landing-footer-simple">
        <div className="landing-footer-simple-inner">
          <p className="landing-footer-company">© CLASMO DIAGNOSTICS PVT LTD.</p>
          <ul className="landing-footer-details">
            <li><span>Address:</span> -</li>
            <li><span>Contacts:</span> -</li>
            <li><span>Bank Details:</span> -</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
