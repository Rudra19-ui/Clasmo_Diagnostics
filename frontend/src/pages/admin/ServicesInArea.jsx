import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

export default function ServicesInArea() {
  const [rows, setRows] = useState([]);
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getServiceAreaPincodes();
      setRows(data);
    } catch (err) {
      setError(err.message || 'Unable to load service area pincodes.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleAdd = async () => {
    const value = pincode.trim();
    if (!value) {
      setError('Enter a pincode.');
      return;
    }
    if (!/^\d+$/.test(value)) {
      setError('Pincode must contain digits only.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.createServiceAreaPincode({ pincode: value });
      setPincode('');
      setSuccess('Pincode added successfully.');
      await loadRows();
    } catch (err) {
      setError(err.message || 'Unable to add pincode.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete pincode ${row.pincode}?`)) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.deleteServiceAreaPincode(row.id);
      setSuccess('Pincode deleted successfully.');
      await loadRows();
    } catch (err) {
      setError(err.message || 'Unable to delete pincode.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout activePage="administration">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/administration">Administration</Link></li>
            <li>Lab Management</li>
            <li>Services In Area</li>
          </ul>
        </nav>

        <section className="cc-mgmt-panel sia-panel">
          <h2 className="change-password-title sia-title">Services In Area</h2>

          <div className="sia-add-form">
            <label htmlFor="sia-pincode">Enter PinCode :</label>
            <input
              id="sia-pincode"
              type="text"
              value={pincode}
              onChange={(event) => setPincode(event.target.value)}
              disabled={submitting}
            />
            <button type="button" className="btn-outline btn-sm" onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add'}
            </button>
          </div>

          {error && <p className="change-password-message error" role="alert">{error}</p>}
          {success && <p className="change-password-message success" role="status">{success}</p>}

          <div className="data-table-wrap sia-table-wrap">
            <table className="data-table sia-table">
              <thead>
                <tr>
                  <th />
                  <th>Pincode</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={2} className="empty-msg">Loading...</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={2} className="empty-msg">No pincodes added.</td></tr>
                )}
                {!loading && rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        type="button"
                        className="sia-delete-link"
                        onClick={() => handleDelete(row)}
                        disabled={submitting}
                      >
                        Delete
                      </button>
                    </td>
                    <td>{row.pincode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
