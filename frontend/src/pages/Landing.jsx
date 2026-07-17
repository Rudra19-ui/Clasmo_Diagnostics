import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import clasmoLogo from '../assets/clasmo-logo.png';
import DepartmentGrid from '../components/landing/DepartmentGrid';
import JoinWithClasmo from '../components/landing/JoinWithClasmo';
import LandingBrandTitle from '../components/landing/LandingBrandTitle';
import '../styles/landing.css';

const BRANCHES = ['MUMBAI', 'PUNE', 'NASHIK', 'DHULE', 'RATNAGIRI'];

export default function Landing() {
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef(null);

  const openForm = (event) => {
    event.preventDefault();
    setFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  useEffect(() => {
    if (window.location.hash !== '#join-form') return;
    setFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  return (
    <div className="landing-page landing-sketch">
      <header className="landing-sketch-header">
        <img src={clasmoLogo} alt="Clasmo Diagnostics logo" className="landing-sketch-logo" />
        <LandingBrandTitle />
        <span className="landing-iso-badge" title="ISO Certified">ISO<br />logo</span>
      </header>

      <p className="landing-sketch-tagline">Where Accuracy Saves Lives</p>
      <hr className="landing-sketch-rule" />

      <section className={`landing-sketch-actions${formOpen ? ' join-open' : ''}`}>
        <Link to="/test-quorum" className="btn-test-quorum">TEST QUORUM</Link>
        <a href="#join-form" className="landing-join-band landing-join-band-inline" onClick={openForm}>
          <span>Come and Join With Clasmo</span>
          <span aria-hidden="true">→</span>
        </a>
      </section>

      {formOpen && (
        <div ref={formRef} className="landing-join-inline-wrap">
          <JoinWithClasmo onClose={() => setFormOpen(false)} />
        </div>
      )}

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

      <section className="landing-login-section">
        <Link to="/login" className="btn-landing-login landing-login-big">LOG IN</Link>
      </section>

      <footer id="contact" className="landing-footer landing-footer-simple">
        <div className="landing-footer-simple-inner">
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
