function DetailItem({ label, value }) {
  return (
    <div className="sample-scan-detail-item">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

export default function SampleScanResultPanel({
  result,
  classPrefix = 'pathologist',
  showActions = false,
  actions = null,
}) {
  if (!result?.found) return null;

  const gender = result.gender_label || result.gender || '—';
  const age = result.age || result.age_sex || '—';
  const testType = result.test_type || result.sample_type || '—';
  const messageClass = classPrefix === 'sample-scan' ? 'sample-scan-message' : `${classPrefix}-message`;
  const badgeClass = classPrefix === 'sample-scan' ? 'sample-scan-status-badge' : `${classPrefix}-scan-badge`;
  const subtitleClass = classPrefix === 'sample-scan' ? 'sample-scan-subtitle' : `${classPrefix}-scan-subtitle`;
  const headerClass = classPrefix === 'sample-scan' ? 'sample-scan-result-header' : `${classPrefix}-scan-result-header`;
  const resultClass = classPrefix === 'sample-scan' ? 'sample-scan-result' : `${classPrefix}-scan-result`;
  const testsTitleClass = classPrefix === 'sample-scan' ? 'sample-scan-tests-title' : `${classPrefix}-tests-title`;
  const tableWrapClass = classPrefix === 'sample-scan' ? 'sample-scan-table-wrap' : `${classPrefix}-table-wrap`;
  const tableClass = classPrefix === 'sample-scan' ? 'sample-scan-table' : `${classPrefix}-table`;

  return (
    <div className={`${resultClass} sample-scan-result-card`}>
      <div className={headerClass}>
        <div>
          <h2>{result.patient_name || 'Patient'}</h2>
          <p className={subtitleClass}>
            Barcode scanned successfully
          </p>
        </div>
        <span className={badgeClass}>{result.registration_status || 'Registered'}</span>
      </div>

      <div className="sample-scan-detail-grid">
        <DetailItem label="Lab Code" value={result.lab_code} />
        <DetailItem label="Patient ID" value={result.patient_id} />
        <DetailItem label="Patient Name" value={result.patient_name} />
        <DetailItem label="Age" value={age} />
        <DetailItem label="Gender" value={gender} />
        <DetailItem label="Register Date" value={result.registration_date} />
        <DetailItem label="Test Type / Sample" value={testType} />
        <DetailItem label="Barcode" value={result.barcode} />
        <DetailItem label="Doctor" value={result.doctor_name} />
        <DetailItem label="Mobile" value={result.mobile} />
        <DetailItem label="Patient Type" value={result.patient_type} />
        <DetailItem label="Collection Center" value={result.collection_center} />
      </div>

      <h3 className={testsTitleClass}>
        Tests ({result.tests?.length || 0})
        {testType && testType !== '—' ? ` — ${testType}` : ''}
      </h3>

      {result.tests?.length ? (
        <div className={tableWrapClass}>
          <table className={`${tableClass} sample-scan-detail-table`}>
            <thead>
              <tr>
                <th>#</th>
                <th>Test Name</th>
                <th>Test Type</th>
                <th>Sample Type</th>
              </tr>
            </thead>
            <tbody>
              {result.tests.map((test, index) => (
                <tr key={test.id || `${test.test_id}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{test.name}</td>
                  <td>{test.test_type || testType}</td>
                  <td>{test.sample_type || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={`${messageClass} ${messageClass}--warn`}>
          No tests found for this barcode / sample type.
        </p>
      )}

      {result.linked_barcodes?.length > 1 && (
        <div className="sample-scan-linked-list">
          <h4>Other linked barcodes for this patient</h4>
          <ul>
            {result.linked_barcodes.map((item) => (
              <li key={`${item.sample_type}-${item.barcode}`}>
                <strong>{item.sample_type || 'General'}</strong>: {item.barcode}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showActions && actions}
    </div>
  );
}
