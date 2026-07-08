function parseNumeric(value) {
  if (value == null || value === '') return null;
  const match = String(value).replace(/,/g, '').match(/-?\d+\.?\d*/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isNaN(num) ? null : num;
}

function parseRange(rangeStr) {
  if (!rangeStr || !String(rangeStr).trim()) return [null, null];
  const text = String(rangeStr).trim().replace('–', '-');
  if (text.startsWith('<')) return [null, parseNumeric(text.slice(1))];
  if (text.startsWith('>')) return [parseNumeric(text.slice(1)), null];
  if (text.includes('-')) {
    const [lowPart, highPart] = text.split('-', 2);
    return [parseNumeric(lowPart), parseNumeric(highPart)];
  }
  const single = parseNumeric(text);
  return single == null ? [null, null] : [single, single];
}

export function selectReferenceRange(parameter, report) {
  const age = report?.patient_age ?? report?.patient_details?.age_years ?? 0;
  const gender = report?.patient_gender ?? '';
  if (age > 0 && age < 18 && parameter.reference_range_child) {
    return parameter.reference_range_child;
  }
  if (gender === 'female' && parameter.reference_range_female) {
    return parameter.reference_range_female;
  }
  return parameter.reference_range_male || parameter.reference_range_female || parameter.reference_range_child || '';
}

export function calculateResultFlag(value, parameter, report) {
  const numeric = parseNumeric(value);
  if (numeric == null) return 'Normal';

  if (parameter.critical_low != null && numeric <= Number(parameter.critical_low)) return 'Critical';
  if (parameter.critical_high != null && numeric >= Number(parameter.critical_high)) return 'Critical';

  const [low, high] = parseRange(selectReferenceRange(parameter, report));
  if (low != null && numeric < low) return 'Low';
  if (high != null && numeric > high) return 'High';
  return 'Normal';
}

export function isAbnormalFlag(flag) {
  return flag === 'High' || flag === 'Low' || flag === 'Critical';
}

export function groupParameters(parameters = []) {
  const groups = {};
  parameters.forEach((param) => {
    const key = param.test_name || `Test ${param.test}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(param);
  });
  return groups;
}
