import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PatientStatusBadge from '../dashboard/PatientStatusBadge';
import {
  WORKFLOW_STAGE_ORDER,
  enrichRegistrationWithWorkflow,
  getWorkflowStageMeta,
  summarizeWorkflowStages,
} from '../../utils/patientWorkflowStatus';

function formatTestsList(tests) {
  const names = Array.isArray(tests)
    ? tests
    : String(tests || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (!names.length) return '—';
  return (
    <ol className="report-section-test-list">
      {names.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ol>
  );
}

export default function ReportSectionTable({
  rows,
  loading,
  emptyMessage,
  from = 'all',
  showLegend = true,
}) {
  const [selected, setSelected] = useState(() => new Set());

  const enrichedRows = useMemo(
    () => rows.map(enrichRegistrationWithWorkflow),
    [rows],
  );

  const stageCounts = useMemo(
    () => summarizeWorkflowStages(rows),
    [rows],
  );

  const allIds = useMemo(() => rows.map((row) => row.id).filter(Boolean), [rows]);

  const toggleAll = (checked) => {
    setSelected(checked ? new Set(allIds) : new Set());
  };

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const legendItems = WORKFLOW_STAGE_ORDER.map((stage) => ({
    stage,
    ...getWorkflowStageMeta(stage),
    count: stageCounts[stage] || 0,
  }));

  return (
    <div className="report-section-table-wrap">
      {showLegend && rows.length > 0 && (
        <div className="report-section-legend" role="list" aria-label="Status color legend">
          {legendItems.map((item) => (
            <div
              key={item.stage}
              role="listitem"
              className="report-section-legend-item"
              style={{
                '--stage-color': item.color,
                '--stage-bg': item.background,
                '--stage-border': item.border,
              }}
            >
              <span className="report-section-legend-swatch" aria-hidden />
              <span className="report-section-legend-label">{item.shortLabel}</span>
              <span className="report-section-legend-count">{item.count}</span>
            </div>
          ))}
        </div>
      )}

      <table className="report-section-table">
        <thead>
          <tr>
            <th className="report-section-check-col">
              <input
                type="checkbox"
                aria-label="Select all bookings"
                checked={allSelected}
                onChange={(e) => toggleAll(e.target.checked)}
              />
            </th>
            <th>Booking ID</th>
            <th>Patient Name</th>
            <th>Barcodes</th>
            <th>Ref By</th>
            <th>Test Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={7} className="report-section-empty">{emptyMessage}</td>
            </tr>
          )}
          {enrichedRows.map((row) => {
            const tests = row.tests_list || (row.test_names ? row.test_names.split(', ') : []);
            const patientLabel = row.patient_display
              || row.patient_name
              || '—';
            return (
              <tr
                key={row.id || row.lab_code}
                className="report-section-row"
                style={{
                  '--row-bg': row.workflowMeta.background,
                  '--row-border': row.workflowMeta.border,
                }}
              >
                <td className="report-section-check-col">
                  <input
                    type="checkbox"
                    aria-label={`Select booking ${row.lab_code}`}
                    checked={selected.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                  />
                </td>
                <td>{row.lab_code}</td>
                <td>
                  <Link
                    to={`/franchise/manage-reports/detail/${encodeURIComponent(row.lab_code)}?from=${from}`}
                    className="report-section-patient-link"
                  >
                    {patientLabel}
                  </Link>
                </td>
                <td>{row.barcodes || '—'}</td>
                <td>{row.ref_by || row.patient?.doctor_name || 'Self'}</td>
                <td>{formatTestsList(tests)}</td>
                <td>
                  <PatientStatusBadge stage={row.workflowStage} compact />
                  <span className="report-section-progress">
                    {row.report_progress || row.status || '—'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > 0 && (
        <p className="report-section-footer">
          Showing 1 to {rows.length} of {rows.length} entries
        </p>
      )}
    </div>
  );
}
