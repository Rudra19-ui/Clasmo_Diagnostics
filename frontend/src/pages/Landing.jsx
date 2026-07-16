import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import clasmoLogo from '../assets/clasmo-logo.png';
import DepartmentGrid from '../components/landing/DepartmentGrid';
import JoinWithClasmo from '../components/landing/JoinWithClasmo';
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
        <div ref={formRef}>
          <JoinWithClasmo onClose={() => setFormOpen(false)} />
        </div>
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
