import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

const emptyForm = () => ({
  report_note: '',
  report_comments: '',
  clinical_significance: '',
});

export default function Notes() {
  const [tests, setTests] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
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
      || test.test_code?.toLowerCase().includes(q)
      || test.sample_type?.toLowerCase().includes(q)
      || (test.report_note || '').toLowerCase().includes(q)
      || (test.report_comments || '').toLowerCase().includes(q)
    ));
  }, [tests, search]);

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await api.getTests();
      setTests(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || 'Unable to load tests.');
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSelectTest = (test) => {
    setSelectedTestId(String(test.id));
    setForm({
      report_note: test.report_note || '',
      report_comments: test.report_comments || '',
      clinical_significance: test.clinical_significance || '',
    });
    setSuccess('');
    setError('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!selectedTestId) {
      setError('Select a test first.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api.updateTest(selectedTestId, {
        report_note: form.report_note.trim(),
        report_comments: form.report_comments.trim(),
        clinical_significance: form.clinical_significance.trim(),
      });
      setTests((prev) => prev.map((t) => (String(t.id) === String(selectedTestId) ? { ...t, ...updated } : t)));
      setSuccess('Notes saved for this test.');
    } catch (err) {
      setError(err.message || 'Unable to save notes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout activePage="notes">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li>Notes</li>
          </ul>
        </nav>

        <section className="master-panel">
          <div className="admin-module-header" style={{ marginBottom: 12 }}>
            <div>
              <h2 className="change-password-title">Notes</h2>
              <p className="admin-module-desc">
                Standard report notes, comments, and clinical significance text per test.
              </p>
            </div>
          </div>

          {error ? <p className="login-error">{error}</p> : null}
          {success ? <p style={{ color: '#2e7d32' }}>{success}</p> : null}

          <div className="test-details-layout">
            <aside className="test-details-list-panel">
              <div className="master-field">
                <label htmlFor="notes-search">Search tests</label>
                <input
                  id="notes-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, code, note text…"
                />
              </div>
              {loading ? (
                <p>Loading tests…</p>
              ) : (
                <div className="test-details-test-list">
                  {!filteredTests.length ? (
                    <p className="empty-msg">No tests match.</p>
                  ) : filteredTests.map((test) => {
                    const hasNotes = Boolean(
                      (test.report_note || '').trim()
                      || (test.report_comments || '').trim()
                      || (test.clinical_significance || '').trim(),
                    );
                    return (
                      <button
                        key={test.id}
                        type="button"
                        className={`test-details-test-item${String(test.id) === String(selectedTestId) ? ' is-active' : ''}`}
                        onClick={() => handleSelectTest(test)}
                      >
                        <strong>{test.name}</strong>
                        <span>
                          {[test.test_code, test.sample_type, hasNotes ? 'Has notes' : 'No notes']
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            <div className="test-details-main-panel">
              {!selectedTest ? (
                <div className="admin-module-placeholder">
                  <h3>Select a test</h3>
                  <p>Choose a test on the left to view or edit NOTE, Comments, and Clinical significance.</p>
                </div>
              ) : (
                <form className="master-form" onSubmit={handleSave}>
                  <h3 className="change-password-title" style={{ fontSize: '1.1rem' }}>
                    {selectedTest.name}
                  </h3>
                  <p className="admin-module-desc" style={{ marginTop: 0 }}>
                    {[selectedTest.test_code, selectedTest.sample_type].filter(Boolean).join(' · ') || '—'}
                  </p>

                  <div className="master-field" style={{ marginTop: 12 }}>
                    <label htmlFor="notes-report-note">NOTE (report)</label>
                    <textarea
                      id="notes-report-note"
                      rows={5}
                      value={form.report_note}
                      onChange={(e) => setField('report_note', e.target.value)}
                      placeholder="NOTE text shown on the report"
                    />
                  </div>
                  <div className="master-field">
                    <label htmlFor="notes-comments">Comments</label>
                    <textarea
                      id="notes-comments"
                      rows={4}
                      value={form.report_comments}
                      onChange={(e) => setField('report_comments', e.target.value)}
                      placeholder="Comments block on the report"
                    />
                  </div>
                  <div className="master-field">
                    <label htmlFor="notes-clinical">Clinical significance</label>
                    <textarea
                      id="notes-clinical"
                      rows={5}
                      value={form.clinical_significance}
                      onChange={(e) => setField('clinical_significance', e.target.value)}
                      placeholder="Clinical significance text"
                    />
                  </div>

                  <div className="master-actions" style={{ marginTop: 12 }}>
                    <button type="submit" className="btn-blue" disabled={saving}>
                      {saving ? 'Saving…' : 'Save notes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
