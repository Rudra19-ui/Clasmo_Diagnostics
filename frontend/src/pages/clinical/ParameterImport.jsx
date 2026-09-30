import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import '../../styles/clinical.css';

export default function ParameterImport() {
  const [coverage, setCoverage] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [genResult, setGenResult] = useState(null);

  const loadCoverage = useCallback(async () => {
    try {
      const data = await api.getSampleReportCoverage();
      setCoverage(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadCoverage();
  }, [loadCoverage]);

  const runImport = async (dryRun) => {
    if (!file) {
      setError('Choose a CSV file first.');
      return;
    }
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const data = await api.importTestParameters(file, { dryRun });
      setResult(data);
      if (!dryRun) await loadCoverage();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (!window.confirm(
      'Create one default result parameter for every test that has none?\n\n'
      + 'This instantly enables sample reports for the full catalog. You can refine units/ranges later via CSV.',
    )) {
      return;
    }
    setBusy(true);
    setError('');
    setGenResult(null);
    try {
      const data = await api.autoGenerateSampleParameters({ only_missing: true });
      setGenResult(data);
      setCoverage(data.coverage || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout activePage="clinical">
      <main className="dash-main">
        <h2 className="page-heading">Parameter Import & Sample Reports</h2>
        <p className="page-sub">
          Bulk-load parameters for hundreds of tests from one CSV, or auto-create placeholder
          parameters so every test gets a sample report format instantly.
        </p>

        <section className="clinical-panel">
          <h3>Coverage</h3>
          {coverage ? (
            <div className="param-coverage-grid">
              <div>
                <span>Total tests</span>
                <strong>{coverage.total_tests}</strong>
              </div>
              <div>
                <span>With parameters</span>
                <strong>{coverage.tests_with_parameters}</strong>
              </div>
              <div>
                <span>Missing</span>
                <strong>{coverage.tests_missing_parameters}</strong>
              </div>
              <div>
                <span>Coverage</span>
                <strong>{coverage.coverage_pct}%</strong>
              </div>
            </div>
          ) : (
            <p>Loading coverage…</p>
          )}
          <div className="param-coverage-bar" aria-hidden="true">
            <div
              className="param-coverage-bar__fill"
              style={{ width: `${Math.min(100, coverage?.coverage_pct || 0)}%` }}
            />
          </div>
          {coverage?.missing_sample?.length > 0 && (
            <p className="page-sub" style={{ marginTop: 12 }}>
              Missing examples:{' '}
              {coverage.missing_sample.slice(0, 8).map((t) => t.name).join(', ')}
              {coverage.missing_truncated ? '…' : ''}
            </p>
          )}
        </section>

        <section className="clinical-panel">
          <h3>1. Auto-generate sample report parameters</h3>
          <p className="page-sub">
            One click creates a single result row for every test without parameters.
            Sample Report then shows the shared format with blank machine placeholders.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn-blue" disabled={busy} onClick={handleAutoGenerate}>
              {busy ? 'Working…' : 'Auto-generate for missing tests'}
            </button>
            <Link to="/portfolio/sample-report" className="btn-outline">Open Sample Reports</Link>
          </div>
          {genResult && (
            <p className="clinical-success-msg" style={{ marginTop: 12 }}>
              Created {genResult.created} parameters
              {genResult.skipped ? ` · skipped ${genResult.skipped} already present` : ''}.
            </p>
          )}
        </section>

        <section className="clinical-panel">
          <h3>2. Bulk CSV import (recommended for real ranges)</h3>
          <p className="page-sub">
            Columns: test_code / test_name, parameter_name, unit, method, reference ranges,
            sample_value, sort_order. Matching uses test_code first, then exact test name.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button
              type="button"
              className="btn-outline"
              disabled={busy}
              onClick={() => api.downloadParameterImportTemplate(false).catch((e) => setError(e.message))}
            >
              Download example CSV
            </button>
            <button
              type="button"
              className="btn-outline"
              disabled={busy}
              onClick={() => api.downloadParameterImportTemplate(true).catch((e) => setError(e.message))}
            >
              Download all-tests starter CSV
            </button>
            <Link to="/clinical/test-parameters" className="btn-outline">Parameter Master</Link>
          </div>

          <div className="form-row">
            <label htmlFor="param-csv">CSV file</label>
            <input
              id="param-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn-outline" disabled={busy || !file} onClick={() => runImport(true)}>
              Preview (dry run)
            </button>
            <button type="button" className="btn-blue" disabled={busy || !file} onClick={() => runImport(false)}>
              Import parameters
            </button>
          </div>
        </section>

        {error && <p className="login-error">{error}</p>}

        {result && (
          <section className="clinical-panel">
            <h3>{result.dry_run ? 'Dry-run preview' : 'Import result'}</h3>
            <p>
              OK rows: <strong>{result.rows_ok}</strong>
              {' · '}
              Errors: <strong>{result.rows_error}</strong>
              {!result.dry_run && (
                <>
                  {' · '}
                  Created: <strong>{result.created}</strong>
                  {' · '}
                  Updated: <strong>{result.updated}</strong>
                </>
              )}
            </p>
            {result.preview?.length > 0 && (
              <div className="data-table-scroll">
                <table className="data-table data-table-responsive">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Test</th>
                      <th>Parameter</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.map((row) => (
                      <tr key={`${row.line}-${row.parameter_name}`}>
                        <td data-label="Line">{row.line}</td>
                        <td data-label="Test">{row.test}</td>
                        <td data-label="Parameter">{row.parameter_name}</td>
                        <td data-label="Action">{row.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {result.errors?.length > 0 && (
              <ul className="param-import-errors">
                {result.errors.map((err) => (
                  <li key={`${err.line}-${err.error}`}>Line {err.line}: {err.error}</li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
      <Footer />
    </Layout>
  );
}
