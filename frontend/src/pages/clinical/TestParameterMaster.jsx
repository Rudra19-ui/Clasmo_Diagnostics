import { useCallback, useEffect, useState } from 'react';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import '../../styles/clinical.css';

const emptyForm = () => ({
  test: '',
  parameter_name: '',
  unit: '',
  reference_range_male: '',
  reference_range_female: '',
  reference_range_child: '',
  critical_low: '',
  critical_high: '',
  is_active: true,
});

export default function TestParameterMaster() {
  const [parameters, setParameters] = useState([]);
  const [tests, setTests] = useState([]);
  const [filterTest, setFilterTest] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [params, testList] = await Promise.all([
        api.getTestParameters({ test_id: filterTest || undefined, active_only: 'false' }),
        api.getTests(),
      ]);
      setParameters(params);
      setTests(testList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterTest]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    setForm({
      test: row.test,
      parameter_name: row.parameter_name,
      unit: row.unit || '',
      reference_range_male: row.reference_range_male || '',
      reference_range_female: row.reference_range_female || '',
      reference_range_child: row.reference_range_child || '',
      critical_low: row.critical_low ?? '',
      critical_high: row.critical_high ?? '',
      is_active: row.is_active,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const payload = {
      ...form,
      test: Number(form.test),
      critical_low: form.critical_low === '' ? null : form.critical_low,
      critical_high: form.critical_high === '' ? null : form.critical_high,
    };
    try {
      if (editingId) {
        await api.updateTestParameter(editingId, payload);
        setMessage('Parameter updated successfully.');
      } else {
        await api.createTestParameter(payload);
        setMessage('Parameter created successfully.');
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this parameter?')) return;
    try {
      await api.deleteTestParameter(id);
      setMessage('Parameter deactivated.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Layout activePage="clinical">
      <main className="dash-main">
        <h2 className="page-heading">Test Parameter Master</h2>
        <p className="page-sub">Manage reference ranges and critical limits per test parameter.</p>

        <section className="clinical-panel">
          <h3>{editingId ? 'Edit Parameter' : 'Add Parameter'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="param-form-grid">
              <div className="form-row">
                <label>Test *</label>
                <select required value={form.test} onChange={(e) => setForm({ ...form, test: e.target.value })}>
                  <option value="">Select test</option>
                  {tests.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Parameter Name *</label>
                <input required value={form.parameter_name} onChange={(e) => setForm({ ...form, parameter_name: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Unit</label>
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Ref. Range (Male)</label>
                <input placeholder="e.g. 13.0-17.0" value={form.reference_range_male} onChange={(e) => setForm({ ...form, reference_range_male: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Ref. Range (Female)</label>
                <input placeholder="e.g. 12.0-15.0" value={form.reference_range_female} onChange={(e) => setForm({ ...form, reference_range_female: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Ref. Range (Child)</label>
                <input placeholder="e.g. 11.0-14.0" value={form.reference_range_child} onChange={(e) => setForm({ ...form, reference_range_child: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Critical Low</label>
                <input type="number" step="any" value={form.critical_low} onChange={(e) => setForm({ ...form, critical_low: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Critical High</label>
                <input type="number" step="any" value={form.critical_high} onChange={(e) => setForm({ ...form, critical_high: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Active</label>
                <label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Is Active</label>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button type="submit" className="btn-blue">{editingId ? 'Update' : 'Create'}</button>
              {editingId && <button type="button" onClick={resetForm}>Cancel</button>}
            </div>
          </form>
        </section>

        <section className="clinical-panel">
          <div className="clinical-toolbar">
            <div className="form-row">
              <label>Filter by Test</label>
              <select value={filterTest} onChange={(e) => setFilterTest(e.target.value)}>
                <option value="">All tests</option>
                {tests.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button type="button" className="btn-blue" onClick={load}>Refresh</button>
          </div>

          {error && <p className="login-error">{error}</p>}
          {message && <p style={{ color: '#2e7d32' }}>{message}</p>}
          {loading ? <p>Loading parameters...</p> : (
            <div className="data-table-scroll">
            <table className="data-table data-table-responsive">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Parameter</th>
                  <th>Unit</th>
                  <th>Male</th>
                  <th>Female</th>
                  <th>Child</th>
                  <th>Critical</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!parameters.length ? (
                  <tr><td colSpan="9" className="empty-msg" data-label="">No parameters found.</td></tr>
                ) : parameters.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Test">{p.test_name}</td>
                    <td data-label="Parameter">{p.parameter_name}</td>
                    <td data-label="Unit">{p.unit}</td>
                    <td data-label="Male">{p.reference_range_male}</td>
                    <td data-label="Female">{p.reference_range_female}</td>
                    <td data-label="Child">{p.reference_range_child}</td>
                    <td data-label="Critical">{p.critical_low ?? '—'} / {p.critical_high ?? '—'}</td>
                    <td data-label="Active">{p.is_active ? 'Yes' : 'No'}</td>
                    <td data-label="Actions">
                      <button type="button" className="btn-link" onClick={() => handleEdit(p)}>Edit</button>
                      {' '}
                      {p.is_active && (
                        <button type="button" className="btn-link" onClick={() => handleDeactivate(p.id)}>Deactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
