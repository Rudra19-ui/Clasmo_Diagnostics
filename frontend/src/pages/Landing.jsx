import { Link } from 'react-router-dom';
import heroImage from '../assets/hero.png';
import '../styles/landing.css';

const FEATURES = [
  {
    icon: '🔍',
    title: 'Search & Patient Lookup',
    description: 'Instantly find patients, lab codes, and registration history across your network.',
  },
  {
    icon: '📋',
    title: 'Test Registration & Billing',
    description: 'Streamline test orders, pricing, payments, and billing workflows in one place.',
  },
  {
    icon: '✅',
    title: 'Test Result & Authorization',
    description: 'Enter, review, and authorize results with role-based clinical workflows.',
  },
  {
    icon: '⚙️',
    title: 'Advanced Administration & Analytics',
    description: 'Manage users, parameters, permissions, and lab-wide configuration with ease.',
  },
  {
    icon: '📊',
    title: 'Reports & Interactive Dashboards',
    description: 'Real-time dashboards and exportable reports for smarter operational decisions.',
  },
  {
    icon: '🏠',
    title: 'Device Request & Home Sample Collection',
    description: 'Coordinate pickup requests, home visits, and field collection seamlessly.',
  },
];

const AUDIENCES = [
  {
    title: 'Independent Labs',
    description: 'Digitize end-to-end operations without enterprise complexity or cost.',
  },
  {
    title: 'Hospital Labs',
    description: 'Integrate registration, results, and reporting within your hospital workflow.',
  },
  {
    title: 'Diagnostic Networks',
    description: 'Scale across multiple collection centers with centralized control and visibility.',
  },
];

export default function Landing() {
  return (
    <div className="landing-page">
      <header className="landing-navbar">
        <Link to="/" className="landing-brand">
          <span className="logo-mark landing-logo-mark">C</span>
          <span>
            <strong>Clasmo Diagnostics</strong>
            <small>Laboratory Information Management System</small>
          </span>
        </Link>
        <nav className="landing-nav-actions">
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#audience" className="landing-nav-link">Who It&apos;s For</a>
          <a href="#contact" className="landing-nav-link">Contact</a>
          <Link to="/login" className="btn-landing-login">Login</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">B2B LIMS Platform for Diagnostic Labs</span>
            <h1>Streamline Your Diagnostic Lab Operations</h1>
            <p>
              Clasmo Diagnostics is a cloud-ready LIMS built for labs that want faster registrations,
              accurate results, and smarter reporting — subscribe and go live without heavy IT overhead.
            </p>
            <div className="landing-hero-cta">
              <Link to="/login" className="btn-landing-primary">Partner With Us</Link>
              <a href="#features" className="btn-landing-secondary">Explore Modules</a>
            </div>
            <ul className="landing-hero-stats">
              <li><strong>6+</strong> integrated modules</li>
              <li><strong>Multi-role</strong> access control</li>
              <li><strong>Cloud</strong> deployment ready</li>
            </ul>
          </div>
          <div className="landing-hero-visual">
            <img src={heroImage} alt="Clasmo Diagnostics lab management dashboard preview" />
          </div>
        </div>
      </section>

      <section id="features" className="landing-section landing-features">
        <div className="landing-section-head">
          <span className="landing-eyebrow">Platform Modules</span>
          <h2>Everything your lab needs in one system</h2>
          <p>From patient lookup to home collection — manage the full diagnostic lifecycle.</p>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="landing-feature-card">
              <span className="landing-feature-icon" aria-hidden="true">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="audience" className="landing-section landing-audience">
        <div className="landing-section-head">
          <span className="landing-eyebrow">Built For Growth</span>
          <h2>Who Clasmo Diagnostics is for</h2>
          <p>Whether you run a single lab or a multi-center network, our platform scales with you.</p>
        </div>
        <div className="landing-audience-grid">
          {AUDIENCES.map((item) => (
            <article key={item.title} className="landing-audience-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta-band">
        <div className="landing-cta-band-inner">
          <div>
            <h2>Ready to modernize your lab?</h2>
            <p>Start with a trial login or reach out to partner with our team.</p>
          </div>
          <Link to="/login" className="btn-landing-primary">Get Started</Link>
        </div>
      </section>

      <footer id="contact" className="landing-footer">
        <div className="landing-footer-grid">
          <div>
            <div className="landing-brand landing-brand-footer">
              <span className="logo-mark landing-logo-mark">C</span>
              <span>
                <strong>Clasmo Diagnostics</strong>
                <small>Diagnostic Lab Management Platform</small>
              </span>
            </div>
            <p className="landing-footer-tagline">
              Laboratory Information Management System for diagnostic labs across India.
            </p>
          </div>
          <div>
            <h4>Contact</h4>
            <ul className="landing-footer-links">
              <li><a href="tel:+918975273383">+91-8975273383</a></li>
              <li><a href="tel:+919146188320">+91-9146188320</a></li>
            </ul>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul className="landing-footer-links">
              <li><Link to="/login">Login</Link></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#audience">Who It&apos;s For</a></li>
            </ul>
          </div>
        </div>
        <p className="landing-footer-copy">
          © 2026 Clasmo Diagnostics · Empowering labs with smarter, faster operations.
        </p>
      </footer>
    </div>
  );
}
