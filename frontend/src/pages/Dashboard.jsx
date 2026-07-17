import { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const DASHBOARD_ACTIONS = [
  { label: 'Enquire Box', href: '/enquire-box' },
  { label: 'Our Partner', href: '/#join-form' },
  { label: 'Query Complaint', href: '/device/message-to-lab' },
  { label: 'Self Patient Query', href: '/search' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async (event) => {
    event.preventDefault();
    const text = feedback.trim();
    if (!text) return;

    setSubmitting(true);
    setFeedbackStatus('');
    try {
      await api.createMessage(text);
      setFeedback('');
      setFeedbackStatus('Thank you. Your feedback has been submitted and will appear in Query Complaint.');
    } catch (err) {
      setFeedbackStatus(err.message || 'Unable to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

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

          <section className="dashboard-feedback-panel">
            <h2 className="dashboard-feedback-title">Give Feedback</h2>
            <p className="dashboard-feedback-subtitle">
              Share your query, complaint, or suggestion. Submissions from all users appear in{' '}
              <Link to="/device/message-to-lab">Query Complaint</Link>.
            </p>
            <form className="dashboard-feedback-form" onSubmit={submitFeedback}>
              <label htmlFor="dashboard-feedback">
                Your message
                {user?.display_name ? ` (${user.display_name})` : ''}
              </label>
              <textarea
                id="dashboard-feedback"
                rows={4}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Write your feedback, query, or complaint here..."
                required
              />
              <div className="dashboard-feedback-actions">
                <button type="submit" className="btn-blue" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
              {feedbackStatus && (
                <p className={`dashboard-feedback-status${feedbackStatus.startsWith('Thank') ? ' success' : ' error'}`}>
                  {feedbackStatus}
                </p>
              )}
            </form>
          </section>
        </div>
      </main>
      <Footer />
    </Layout>
  );
}
