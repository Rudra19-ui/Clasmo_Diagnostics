import { useState } from 'react';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

export default function MessageToLab() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.createMessage(message);
      setStatus('Message sent to lab.');
      setMessage('');
    } catch (err) {
      setStatus(err.message);
    }
  };

  return (
    <Layout activePage="device-request">
      <main className="dash-main">
        <nav className="breadcrumb"><ul><li><a href="/search">Home</a></li><li>Message To Lab</li></ul></nav>
        <h2 className="page-heading">Message To Lab</h2>
        <form className="content-panel" onSubmit={submit}>
          <div className="form-row"><label>Message</label><textarea required rows="6" value={message} onChange={(e) => setMessage(e.target.value)} /></div>
          <button type="submit" className="btn-blue">Send Message</button>
          {status && <p style={{ marginTop: 12 }}>{status}</p>}
        </form>
      </main>
      <Footer />
    </Layout>
  );
}
