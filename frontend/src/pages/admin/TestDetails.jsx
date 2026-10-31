import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

const emptyParamForm = (testId = '') => ({
  test: testId,
  parameter_name: '',
  unit: '',
  method: '',
  reference_range_male: '',
  reference_range_female: '',
  reference_range_child: '',
  sample_value: '',
  critical_low: '',
  critical_high: '',
  analyzer_code: '',
  sort_order: 0,
  is_active: true,
});

export default function TestDetails() {
  const [tests, setTests] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');
  const [form, setForm] = useState(emptyParamForm());
  const [editingId, setEditingId] = useState(null);
  const [loadingTests, setLoadingTests] = useState(true);
  const [loadingParams, setLoadingParams] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedTest = useMemo(
    () => tests.find((t) => String(t.id) === String(selectedTestId)) || null,
    [tests, selectedTestId],
  );

  const filteredTests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((test) => (
      test.name?.toLowerCase().includes(q)
      || test.short_name?.toLowerCase().includes(q)
      || test.test_code?.toLowerCase().includes(q)
      || test.sample_type?.toLowerCase().includes(q)
      || test.category_name?.toLowerCase().includes(q)
    ));
  }, [tests, search]);

  const loadTests = useCallback(async () => {
    setLoadingTests(true);
    setError('');
    try {
      const rows = await api.getTests();
      setTests(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || 'Unable to load tests.');
      setTests([]);
    } finally {
      setLoadingTests(false);
    }
  }, []);

  const loadParameters = useCallback(async (testId) => {
    if (!testId) {
      setParameters([]);
      return;
    }
    setLoadingParams(true);
    setError('');
    try {
      const rows = await api.getTestParameters({ test_id: testId, active_only: 'false' });
      setParameters(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || 'Unable to load parameters.');
      setParameters([]);
    } finally {
      setLoadingParams(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  useEffect(() => {
    if (selectedTestId) {
      loadParameters(selectedTestId);
      setForm(emptyParamForm(selectedTestId));
      setEditingId(null);
    } else {
      setParameters([]);
    }
  }, [selectedTestId, loadParameters]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(emptyParamForm(selectedTestId));
    setEditingId(null);
  };

  const handleSelectTest = (test) => {
    setSuccess('');
    setSelectedTestId(String(test.id));
  };

  const handleEditParam = (row) => {
    setEditingId(row.id);
    setForm({
      test: row.test,
      parameter_name: row.parameter_name || '',
      unit: row.unit || '',
      method: row.method || '',
      reference_range_male: row.reference_range_male || '',
      reference_range_female: row.reference_range_female || '',
      reference_range_child: row.reference_range_child || '',
      sample_value: row.sample_value || '',
      critical_low: row.critical_low ?? '',
      critical_high: row.critical_high ?? '',
      analyzer_code: row.analyzer_code || '',
      sort_order: row.sort_order ?? 0,
      is_active: Boolean(row.is_active),
    });
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedTestId) {
      setError('Select a test first.');
      return;
    }
    if (!form.parameter_name.trim()) {
      setError('Parameter name is required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      test: Number(selectedTestId),
      parameter_name: form.parameter_name.trim(),
      unit: form.unit.trim(),
      method: form.method.trim(),
      reference_range_male: form.reference_range_male.trim(),
      reference_range_female: form.reference_range_female.trim(),
      reference_range_child: form.reference_range_child.trim(),
      sample_value: form.sample_value.trim(),
      analyzer_code: form.analyzer_code.trim(),
      sort_order: Number(form.sort_order) || 0,
      is_active: Boolean(form.is_active),
      critical_low: form.critical_low === '' ? null : form.critical_low,
      critical_high: form.critical_high === '' ? null : form.critical_high,
    };
    try {
      if (editingId) {
        await api.updateTestParameter(editingId, payload);
        setSuccess('Parameter updated.');
      } else {
        await api.createTestParameter(payload);
        setSuccess('Parameter added.');
      }
      resetForm();
      await loadParameters(selectedTestId);
    } catch (err) {
      setError(err.message || 'Unable to save parameter.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this parameter?')) return;
    setError('');
    setSuccess('');
    try {
      await api.deleteTestParameter(id);
      setSuccess('Parameter deactivated.');
      if (editingId === id) resetForm();
      await loadParameters(selectedTestId);
    } catch (err) {
      setError(err.message || 'Unable to deactivate parameter.');
    }
  };

  return (
    <Layout activePage="administration">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/administration">Administration</Link></li>
            <li>Test Mgmt</li>
            <li>Test Details</li>
          </ul>
        </nav>

        <section className="master-panel">
          <div className="admin-module-header" style={{ marginBottom: 12 }}>
            <div>
              <h2 className="change-password-title">Test Details</h2>
              <p className="admin-module-desc">
                View and edit every test parameter with unit, method, and reference ranges.
              </p>
            </div>
            <Link to="/administration" className="btn-outline">← Back to Administration</Link>
          </div>

          {error ? <p className="login-error">{error}</p> : null}
          {success ? <p style={{ color: '#2e7d32' }}>{success}</p> : null}

          <div className="test-details-layout">
            <aside className="test-details-list-panel">
              <div className="master-field">
                <label htmlFor="test-details-search">Search tests</label>
                <input
                  id="test-details-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, code, sample type…"
                />
              </div>
              {loadingTests ? (
                <p>Loading tests…</p>
              ) : (
                <div className="test-details-test-list">
                  {!filteredTests.length ? (
                    <p className="empty-msg">No tests match.</p>
                  ) : filteredTests.map((test) => (
                    <button
                      key={test.id}
                      type="button"
                      className={`test-details-test-item${String(test.id) === String(selectedTestId) ? ' is-active' : ''}`}
                      onClick={() => handleSelectTest(test)}
                    >
                      <strong>{test.name}</strong>
                      <span>
                        {[test.test_code, test.sample_type, test.category_name].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <div className="test-details-main-panel">
              {!selectedTest ? (
                <div className="admin-module-placeholder">
                  <h3>Select a test</h3>
                  <p>Choose a test on the left to view parameter, unit, and reference range details.</p>
                </div>
              ) : (
                <>
                  <section className="test-details-meta">
                    <h3>{selectedTest.name}</h3>
                    <dl className="test-details-meta-grid">
                      <div><dt>Code</dt><dd>{selectedTest.test_code || '—'}</dd></div>
                      <div><dt>Short name</dt><dd>{selectedTest.short_name || '—'}</dd></div>
                      <div><dt>Sample</dt><dd>{selectedTest.sample_type || '—'}</dd></div>
                      <div><dt>Category</dt><dd>{selectedTest.category_name || '—'}</dd></div>
                      <div><dt>TAT</dt><dd>{selectedTest.tat || '—'}</dd></div>
                      <div><dt>Volume (ml)</dt><dd>{selectedTest.volume_ml ?? '—'}</dd></div>
                      <div><dt>MRP</dt><dd>{selectedTest.mrp ?? '—'}</dd></div>
                      <div><dt>Price</dt><dd>{selectedTest.price ?? '—'}</dd></div>
                    </dl>
                    {(selectedTest.report_note || selectedTest.report_comments || selectedTest.clinical_significance) ? (
                      <div className="test-details-notes">
                        {selectedTest.report_note ? (
                          <p><strong>NOTE:</strong> {selectedTest.report_note}</p>
                        ) : null}
                        {selectedTest.report_comments ? (
                          <p><strong>Comments:</strong> {selectedTest.report_comments}</p>
                        ) : null}
                        {selectedTest.clinical_significance ? (
                          <p><strong>Clinical significance:</strong> {selectedTest.clinical_significance}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </section>

                  <section className="master-form" style={{ marginTop: 16 }}>
                    <h3 className="change-password-title" style={{ fontSize: '1.05rem' }}>
                      {editingId ? 'Edit parameter' : 'Add parameter'}
                    </h3>
                    <form onSubmit={handleSubmit}>
                      <div className="master-form-grid test-details-param-form">
                        <div className="master-field">
                          <label htmlFor="param-name">Parameter *</label>
                          <input
                            id="param-name"
                            required
                            value={form.parameter_name}
                            onChange={(e) => setField('parameter_name', e.target.value)}
                            placeholder="e.g. Haemoglobin"
                          />
                        </div>
                        <div className="master-field">
                          <label htmlFor="param-unit">Unit</label>
                          <input
                            id="param-unit"
                            value={form.unit}
                            onChange={(e) => setField('unit', e.target.value)}
                            placeholder="e.g. g/dL"
                          />
                        </div>
                        <div className="master-field">
                          <label htmlFor="param-method">Method</label>
                          <input
                            id="param-method"
                            value={form.method}
                            onChange={(e) => setField('method', e.target.value)}
                            placeholder="e.g. CLIA"
                          />
                        </div>
                        <div className="master-field">
                          <label htmlFor="param-ref-male">Reference range (Male)</label>
                          <input
                            id="param-ref-male"
                            value={form.reference_range_male}
                            onChange={(e) => setField('reference_range_male', e.target.value)}
                            placeholder="e.g. 13.0 - 17.0"
                          />
                        </div>
                        <div className="master-field">
                          <label htmlFor="param-ref-female">Reference range (Female)</label>
                          <input
                            id="param-ref-female"
                            value={form.reference_range_female}
                            onChange={(e) => setField('reference_range_female', e.target.value)}
                            placeholder="e.g. 12.0 - 15.0"
                          />
                        </div>
                        <div className="master-field">
                          <label htmlFor="param-ref-child">Reference range (Child)</label>
                          <input
                            id="param-ref-child"
                            value={form.reference_range_child}
                            onChange={(e) => setField('reference_range_child', e.target.value)}
                            placeholder="e.g. 11.0 - 14.0"
                          />
                        </div>
                        <div className="master-field">
                          <label htmlFor="param-sample">Sample value</label>
                          <input
                            id="param-sample"
                            value={form.sample_value}
                            onChange={(e) => setField('sample_value', e.target.value)}
                            placeholder="Example result"
                          />
                        </div>
                        <div className="master-field">
                          <label htmlFor="param-crit-low">Critical low</label>
                          <input
                            id="param-crit-low"
                            type="number"
                            step="any"
                            value={form.critical_low}
                            onChange={(e) => setField('critical_low', e.target.value)}
                          />
                        </div>
                        <div className="master-field">
                          <label htmlFor="param-crit-high">Critical high</label>
                          <input
                            id="param-crit-high"
                            type="number"
                            step="any"
                            value={form.critical_high}
                            onChange={(e) => setField('critical_high', e.target.value)}
                          />
                        </div>
                        <div className="master-field">
                          <label htmlFor="param-analyzer">Analyzer code</label>
                          <input
                            id="param-analyzer"
                            value={form.analyzer_code}
                            onChange={(e) => setField('analyzer_code', e.target.value)}
                            placeholder="e.g. HGB"
                          />
                        </div>
                        <div className="master-field">
                          <label htmlFor="param-sort">Sort order</label>
                          <input
                            id="param-sort"
                            type="number"
                            min="0"
                            value={form.sort_order}
                            onChange={(e) => setField('sort_order', e.target.value)}
                          />
                        </div>
                        <div className="master-field">
                          <label htmlFor="param-active">Active</label>
                          <label className="master-check">
                            <input
                              id="param-active"
                              type="checkbox"
                              checked={form.is_active}
                              onChange={(e) => setField('is_active', e.target.checked)}
                            />
                            Is active
                          </label>
                        </div>
                      </div>
                      <div className="master-actions" style={{ marginTop: 12 }}>
                        <button type="submit" className="btn-blue" disabled={saving}>
                          {saving ? 'Saving…' : (editingId ? 'Update parameter' : 'Add parameter')}
                        </button>
                        {editingId ? (
                          <button type="button" className="btn-outline" onClick={resetForm}>Cancel</button>
                        ) : null}
                      </div>
                    </form>
                  </section>

                  <section style={{ marginTop: 20 }}>
                    <h3 className="change-password-title" style={{ fontSize: '1.05rem' }}>
                      Parameters ({parameters.length})
                    </h3>
                    {loadingParams ? (
                      <p>Loading parameters…</p>
                    ) : (
                      <div className="data-table-scroll">
                        <table className="data-table data-table-responsive">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Parameter</th>
                              <th>Unit</th>
                              <th>Method</th>
                              <th>Ref. Male</th>
                              <th>Ref. Female</th>
                              <th>Ref. Child</th>
                              <th>Sample</th>
                              <th>Critical</th>
                              <th>Analyzer</th>
                              <th>Active</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {!parameters.length ? (
                              <tr>
                                <td colSpan="12" className="empty-msg" data-label="">
                                  No parameters for this test yet.
                                </td>
                              </tr>
                            ) : parameters.map((row, index) => (
                              <tr key={row.id} className={editingId === row.id ? 'is-selected' : ''}>
                                <td data-label="#">{row.sort_order ?? index + 1}</td>
                                <td data-label="Parameter">{row.parameter_name}</td>
                                <td data-label="Unit">{row.unit || '—'}</td>
                                <td data-label="Method">{row.method || '—'}</td>
                                <td data-label="Ref. Male">{row.reference_range_male || '—'}</td>
                                <td data-label="Ref. Female">{row.reference_range_female || '—'}</td>
                                <td data-label="Ref. Child">{row.reference_range_child || '—'}</td>
                                <td data-label="Sample">{row.sample_value || '—'}</td>
                                <td data-label="Critical">
                                  {row.critical_low ?? '—'} / {row.critical_high ?? '—'}
                                </td>
                                <td data-label="Analyzer">{row.analyzer_code || '—'}</td>
                                <td data-label="Active">{row.is_active ? 'Yes' : 'No'}</td>
                                <td data-label="Actions">
                                  <button type="button" className="btn-link" onClick={() => handleEditParam(row)}>
                                    Edit
                                  </button>
                                  {' '}
                                  {row.is_active ? (
                                    <button type="button" className="btn-link" onClick={() => handleDeactivate(row.id)}>
                                      Deactivate
                                    </button>
                                  ) : null}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
