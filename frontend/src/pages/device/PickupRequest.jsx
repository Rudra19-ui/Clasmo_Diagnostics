import { useState } from 'react';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

export default function PickupRequest() {
  const [form, setForm] = useState({ patient_name: '', mobile: '', address: '', pickup_date: '' });
  const [message, setMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.createPickupRequest(form);
      setMessage('Pickup request submitted successfully.');
      setForm({ patient_name: '', mobile: '', address: '', pickup_date: '' });
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <Layout activePage="device-request">
      <main className="dash-main">
        <nav className="breadcrumb"><ul><li><a href="/search">Home</a></li><li>Pickup Request</li></ul></nav>
        <h2 className="page-heading">Pickup Request</h2>
        <form className="content-panel" onSubmit={submit}>
          <div className="form-row"><label>Patient Name</label><input required value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} /></div>
          <div className="form-row"><label>Mobile</label><input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
          <div className="form-row"><label>Address</label><textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="form-row"><label>Pickup Date</label><input type="date" required value={form.pickup_date} onChange={(e) => setForm({ ...form, pickup_date: e.target.value })} /></div>
          <button type="submit" className="btn-blue">Submit Request</button>
          {message && <p style={{ marginTop: 12 }}>{message}</p>}
        </form>
      </main>
      <Footer />
    </Layout>
  );
}
