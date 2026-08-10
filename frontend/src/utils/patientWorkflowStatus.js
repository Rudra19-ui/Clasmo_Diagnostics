/** Patient workflow stages for report table color-coding. */
export const WORKFLOW_STAGES = {
  ENTRY_PENDING: 'entry_pending',
  SCANNED: 'scanned',
  ONE_COMPLETE: 'one_complete',
  TWO_COMPLETE: 'two_complete',
  COMPLETE: 'complete',
};

export const WORKFLOW_STAGE_META = {
  [WORKFLOW_STAGES.ENTRY_PENDING]: {
    label: 'Entry Done — Awaiting QR Scan',
    shortLabel: 'Awaiting Scan',
    color: '#b71c1c',
    background: '#ffcdd2',
    border: '#e57373',
  },
  [WORKFLOW_STAGES.SCANNED]: {
    label: 'QR Scanned — Awaiting Results',
    shortLabel: 'Scanned',
    color: '#f57f17',
    background: '#fff9c4',
    border: '#fff176',
  },
  [WORKFLOW_STAGES.ONE_COMPLETE]: {
    label: '1 Test Complete',
    shortLabel: '1 Complete',
    color: '#006064',
    background: '#b2ebf2',
    border: '#4dd0e1',
  },
  [WORKFLOW_STAGES.TWO_COMPLETE]: {
    label: '2 Tests Complete',
    shortLabel: '2 Complete',
    color: '#7b1fa2',
    background: '#e1bee7',
    border: '#ce93d8',
  },
  [WORKFLOW_STAGES.COMPLETE]: {
    label: 'All Tests Complete',
    shortLabel: 'Complete',
    color: '#1b5e20',
    background: '#a5d6a7',
    border: '#66bb6a',
  },
};

export const WORKFLOW_STAGE_ORDER = [
  WORKFLOW_STAGES.ENTRY_PENDING,
  WORKFLOW_STAGES.SCANNED,
  WORKFLOW_STAGES.ONE_COMPLETE,
  WORKFLOW_STAGES.TWO_COMPLETE,
  WORKFLOW_STAGES.COMPLETE,
];

function parseReportProgress(reportProgress) {
  if (!reportProgress || typeof reportProgress !== 'string') {
    return { completed: 0, total: 0 };
  }
  const match = reportProgress.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return { completed: 0, total: 0 };
  return { completed: Number(match[1]), total: Number(match[2]) };
}

function isReceptionScanned(registration) {
  if (registration?.reception_scanned === true) return true;
  const status = String(registration?.status || '').trim();
  return status !== '' && status !== 'Registered';
}

/**
 * Derive workflow stage from a registration search row.
 * Red → entry done, Yellow → QR scanned, Turquoise → 1 done,
 * Light orchid → 2 done, Emerald → all complete.
 */
export function getPatientWorkflowStage(registration) {
  if (!registration) return WORKFLOW_STAGES.ENTRY_PENDING;

  const { completed, total } = parseReportProgress(registration.report_progress);
  const status = registration?.status || '';

  if (status === 'Result Ready' || status === 'Printed') {
    return WORKFLOW_STAGES.COMPLETE;
  }
  if (total > 0 && completed >= total) {
    return WORKFLOW_STAGES.COMPLETE;
  }

  if (completed >= 2 && completed < total) {
    return WORKFLOW_STAGES.TWO_COMPLETE;
  }
  if (completed === 1) {
    return WORKFLOW_STAGES.ONE_COMPLETE;
  }

  if (isReceptionScanned(registration)) {
    return WORKFLOW_STAGES.SCANNED;
  }

  return WORKFLOW_STAGES.ENTRY_PENDING;
}

export function getWorkflowStageMeta(stage) {
  return WORKFLOW_STAGE_META[stage] || WORKFLOW_STAGE_META[WORKFLOW_STAGES.ENTRY_PENDING];
}

export function enrichRegistrationWithWorkflow(registration) {
  const stage = getPatientWorkflowStage(registration);
  return {
    ...registration,
    workflowStage: stage,
    workflowMeta: getWorkflowStageMeta(stage),
  };
}

export function summarizeWorkflowStages(registrations) {
  const counts = WORKFLOW_STAGE_ORDER.reduce((acc, stage) => {
    acc[stage] = 0;
    return acc;
  }, {});

  (registrations || []).forEach((row) => {
    const stage = getPatientWorkflowStage(row);
    counts[stage] += 1;
  });

  return counts;
}
