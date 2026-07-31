import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';

const PROFILE_SAMPLES = [
  {
    name: '1.3 Fitness Advance',
    sampleTypes: ['EDTA Blood', 'Serum'],
    tests: ['CBC', 'Lipid Profile', 'LFT', 'KFT', 'Blood Sugar'],
  },
  {
    name: 'ADVANCE full body check',
    sampleTypes: ['EDTA Blood', 'Serum', 'Fluoride Plasma-01'],
    tests: ['CBC', 'Thyroid', 'Vitamin D', 'HbA1c', 'Urine Routine'],
  },
  {
    name: 'ALLERGY PANEL II',
    sampleTypes: ['EDTA Blood', 'Serum', 'Urine'],
    tests: ['Allergy Profile', 'IgE Total', 'Eosinophil Count'],
  },
];

export default function TestProfile() {
  return (
    <Layout activePage="test-portfolio">
      <main className="dash-main portfolio-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/portfolio/test-list">Test Portfolio</Link></li>
            <li>Test Profile</li>
          </ul>
        </nav>

        <h2 className="page-heading">Test Profile</h2>
        <p className="portfolio-intro">
          Health packages and multi-sample profiles grouped for booking and reporting.
        </p>

        <section className="content-panel portfolio-panel">
          <div className="portfolio-profile-grid">
            {PROFILE_SAMPLES.map((profile) => (
              <article key={profile.name} className="portfolio-profile-card">
                <h3>{profile.name}</h3>
                <p><strong>Sample types:</strong> {profile.sampleTypes.join(', ')}</p>
                <p><strong>Includes:</strong> {profile.tests.join(', ')}</p>
                <Link to="/portfolio/sample-report" className="portfolio-profile-link">
                  View Sample Report →
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
