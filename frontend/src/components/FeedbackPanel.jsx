import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function FeedbackPanel({ className = '' }) {
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
    <section className={`dashboard-feedback-panel${className ? ` ${className}` : ''}`}>
      <h2 className="dashboard-feedback-title">Give Feedback</h2>
      <p className="dashboard-feedback-subtitle">
        Share your query, complaint, or suggestion. Submissions from all users appear in{' '}
        <Link to="/device/message-to-lab">Query Complaint</Link>.
      </p>
      <form className="dashboard-feedback-form" onSubmit={submitFeedback}>
        <label htmlFor="give-feedback-message">
          Your message
          {user?.display_name ? ` (${user.display_name})` : ''}
        </label>
        <textarea
          id="give-feedback-message"
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
  );
}
