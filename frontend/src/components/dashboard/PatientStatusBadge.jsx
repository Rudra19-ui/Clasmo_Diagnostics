import {
  getWorkflowStageMeta,
  getPatientWorkflowStage,
} from '../../utils/patientWorkflowStatus';

export default function PatientStatusBadge({ registration, stage, compact = false }) {
  const resolvedStage = stage || getPatientWorkflowStage(registration);
  const meta = getWorkflowStageMeta(resolvedStage);

  return (
    <span
      className={`patient-status-badge${compact ? ' patient-status-badge--compact' : ''}`}
      style={{
        color: meta.color,
        backgroundColor: meta.background,
        borderColor: meta.border,
      }}
    >
      {compact ? meta.shortLabel : meta.label}
    </span>
  );
}
