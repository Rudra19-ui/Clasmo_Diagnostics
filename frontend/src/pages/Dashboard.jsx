import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';

const DASHBOARD_ACTIONS = [
  { label: 'Enquire Box', href: '/enquire-box' },
  { label: 'Our Partner', href: '/#join-form' },
  { label: 'Query Complaint', href: '/device/message-to-lab' },
  { label: 'Self Patient Query', href: '/self-patient-query' },
];

export default function Dashboard() {
  return (
    <Layout activePage="dashboard">
      <main className="dash-main dashboard-home-main">
        <div className="dashboard-home-shell">
          <h1 className="dashboard-welcome-heading">
            Welcome to <span>Clasmo</span>
          </h1>

          <section className="dashboard-welcome-hero">
            <div className="dashboard-welcome-actions">
              {DASHBOARD_ACTIONS.map((action) => (
                <Link key={action.label} to={action.href} className="dashboard-welcome-btn">
                  {action.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </Layout>
  );
}
