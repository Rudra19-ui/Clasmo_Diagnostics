import { Link } from 'react-router-dom';
import FeedbackPanel from '../components/FeedbackPanel';
import Footer from '../components/Footer';
import Layout from '../components/Layout';

export default function GiveFeedback() {
  return (
    <Layout activePage="give-feedback">
      <main className="dash-main give-feedback-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li>Give Feedback</li>
          </ul>
        </nav>
        <FeedbackPanel className="give-feedback-panel" />
      </main>
      <Footer />
    </Layout>
  );
}
