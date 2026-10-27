import letterheadBanner from '../../assets/clasmo-report-letterhead.png';
import footerBanner from '../../assets/clasmo-report-footer.png';

export const CLASMO_LETTERHEAD = {
  phones: ['+91 9272173712', '+91 8446844726'],
  email: 'Clasmodiagnostics2024@outlook.com',
  address: 'Shri. Bhagwan Mahadev Sambare Hospital, Near ITI Nachane - Kajarghati Road, Ratnagiri 415612',
  addressLines: [
    'Shri. Bhagwan Mahadev Sambare Hospital,',
    'Near ITI Nachane - Kajarghati Road,',
    'Ratnagiri 415612',
  ],
  tagline: 'Where Accuracy Saves Lives',
};

export function isOhProgesteroneTest(name = '') {
  return /17\s*-?\s*oh\s*progesterone/i.test(name);
}

function parseAgeYears(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value);
  const yearsMatch = text.match(/(\d+)\s*(?:Y|Yr|Years?)\b/i)
    || text.match(/-(\d+)\s*\(Y\)/i)
    || text.match(/\b(\d+)\s*\(Y\)/i);
  if (yearsMatch) return Number(yearsMatch[1]);
  const bare = Number(text);
  return Number.isFinite(bare) ? bare : null;
}

function parseGenderToken(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (text === 'm' || text === 'male' || /\bmale\b/.test(text)) return 'male';
  if (text === 'f' || text === 'female' || /\bfemale\b/.test(text)) return 'female';
  return '';
}

/** Resolve Male / Female / Child from registration demographics after entry. */
export function resolveReportCategory(demographics = {}) {
  const years = parseAgeYears(
    demographics.age_years
    ?? demographics.patient_age
    ?? demographics.age_display
    ?? demographics.age_gender,
  );
  const gender = parseGenderToken(
    demographics.gender
    || demographics.patient_gender
    || demographics.gender_label
    || demographics.age_gender
    || demographics.age_display,
  );

  if (years != null && years > 0 && years < 18) return 'child';
  if (gender === 'female') return 'female';
  if (gender === 'male') return 'male';
  return null;
}

function pickRangeForCategory(row, category) {
  const male = (row.reference_range_male || '').trim();
  const female = (row.reference_range_female || '').trim();
  const child = (row.reference_range_child || '').trim();
  const selected = (row.reference_range || '').trim();

  if (category === 'child') return child || selected || male || female;
  if (category === 'female') return female || selected || male || child;
  if (category === 'male') return male || selected || female || child;
  return selected || male || female || child;
}

export function referenceInterval(param, demographics = {}) {
  const category = resolveReportCategory(demographics);
  if (category) return pickRangeForCategory(param, category);

  const male = (param.reference_range_male || '').trim();
  const female = (param.reference_range_female || '').trim();
  const child = (param.reference_range_child || '').trim();
  const selected = (param.reference_range || '').trim();

  // Sample / no patient yet: one range in the column (prefer male), not M+F+Child text.
  return selected || male || female || child || '';
}

function referenceRowsForParameter(row, category) {
  const name = (row.parameter_name || '').trim();
  const male = (row.reference_range_male || '').trim();
  const female = (row.reference_range_female || '').trim();
  const child = (row.reference_range_child || '').trim();
  const selected = (row.reference_range || '').trim();
  const demographicCount = [male, female, child].filter(Boolean).length;

  // Before patient entry: hide Male / Female / Child triples.
  if (!category) {
    if (demographicCount > 1) return [];
    if (male && !female && !child) {
      return [{ category: name || 'Reference', range: male }];
    }
    if (female && !male && !child) {
      return [{ category: name || 'Reference', range: female }];
    }
    if (child && !male && !female) {
      return [{ category: name || 'Reference', range: child }];
    }
    if (selected) return [{ category: name || 'Reference', range: selected }];
    return [];
  }

  const range = pickRangeForCategory(row, category);
  if (!range) return [];

  const label = category === 'child' ? 'Child' : category === 'female' ? 'Female' : 'Male';
  // Keep plain parameter name when only one demographic range exists.
  if (demographicCount <= 1 && !selected) {
    return [{ category: name || label, range }];
  }
  return [{ category: name ? `${name} — ${label}` : label, range }];
}

const OH_CATEGORY_RANGES = [
  { category: '< 1 yr', range: '< 3.00' },
  { category: '> 1 yr', range: '< 2.00' },
  { category: 'Adult Males', range: '0.63 - 2.15' },
  { category: 'Postmenopausal Females', range: '0.19 - 0.71' },
];

const OH_PREMENOPAUSAL_RANGES = [
  { category: 'Follicular phase', range: '0.32 - 1.47' },
  { category: 'Luteal phase', range: '0.25 - 2.91' },
  { category: 'Contraception', range: '0.20 - 1.90' },
];

/** Exact clinical text from official Clasmo 17 OH letterhead PDF. */
const OH_CLINICAL_PARAS = [
  'The adrenal glands, ovaries, testes, and placenta produce OHPG. It is hydroxylated at the 11 and 21 '
  + 'position to produce cortisol. Deficiency of either 11- or 21-hydroxylase results in decreased cortisol '
  + 'synthesis, and feedback inhibition of adrenocorticotropic hormone (ACTH) secretion is lost. Consequent '
  + 'increased pituitary release of ACTH increases production of OHPG. But, if 17-alpha-hydroxylase or '
  + '3-beta-hydroxysteroid dehydrogenase type 2 are deficient, OHPG levels are low with possible increase in '
  + 'progesterone or pregnenolone respectively.',
  'OHPG is bound to both corticosteroid binding globulin and albumin and total OHPG is measured in this assay. '
  + 'OHPG is converted to pregnanetriol, which is conjugated and excreted in the urine. In all instances, more '
  + 'specific tests are available to diagnose disorders or steroid metabolism than pregnanetriol measurement.',
];

function demoValue(value) {
  const text = value != null ? String(value).trim() : '';
  if (text && text !== '—') return { text, blank: false };
  return { text: '', blank: true };
}

/** Clean test/INV titles so print wrap does not orphan ")" after a stray space. */
export function formatReportTitle(name = '') {
  return String(name || '')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

function Field({ label, value, blank, className = '' }) {
  return (
    <div className={`clasmo-report-field${className ? ` ${className}` : ''}`}>
      <span className="clasmo-report-field-label">{label}</span>
      <strong className={blank ? 'is-placeholder' : ''}>{value}</strong>
    </div>
  );
}

function resultDisplay(row, editable, values, onValueChange, { showSampleValues = false } = {}) {
  if (editable) {
    return (
      <input
        type="text"
        className="clasmo-report-result-input"
        value={values[row.id] ?? values[row.parameter_id] ?? ''}
        onChange={(e) => onValueChange?.(row.id ?? row.parameter_id, e.target.value)}
        aria-label={`Result for ${row.parameter_name}`}
      />
    );
  }
  if (row.result != null && String(row.result).trim() !== '') {
    return <strong>{row.result}</strong>;
  }
  if (showSampleValues && row.sample_value) {
    return <strong title="Example sample value">{row.sample_value}</strong>;
  }
  return <span className="report-result-placeholder">&nbsp;</span>;
}

function ReferenceRangeTables({ rows, rangeHeading = 'RANGE', category = null }) {
  const items = rows.flatMap((row) => referenceRowsForParameter(row, category));
  if (!items.length) return null;
  const midpoint = Math.ceil(items.length / 2);
  const columns = items.length === 1 ? [items] : [items.slice(0, midpoint), items.slice(midpoint)];
  return (
    <div className={`clasmo-report-ref-blocks${columns.length === 1 ? ' clasmo-report-ref-blocks--single' : ''}`}>
      {columns.map((column, index) => (
        <table key={column[0]?.category || index} className="clasmo-report-dual-ref clasmo-report-dual-ref--half">
          <thead>
            <tr>
              <th>CATEGORY</th>
              <th>{rangeHeading}</th>
            </tr>
          </thead>
          <tbody>
            {column.map((item) => (
              <tr key={`${item.category}-${item.range}`}>
                <td>{item.category}</td>
                <td>{item.range}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}

function OhReferenceTables() {
  return (
    <div className="clasmo-report-ref-blocks">
      <table className="clasmo-report-dual-ref clasmo-report-dual-ref--half">
        <thead>
          <tr>
            <th>CATEGORY</th>
            <th>RANGE (NG/ML)</th>
          </tr>
        </thead>
        <tbody>
          {OH_CATEGORY_RANGES.map((row) => (
            <tr key={row.category}>
              <td>{row.category}</td>
              <td>{row.range}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="clasmo-report-dual-ref clasmo-report-dual-ref--half">
        <thead>
          <tr>
            <th>PREMENOPAUSAL FEMALES</th>
            <th>RANGE (NG/ML)</th>
          </tr>
        </thead>
        <tbody>
          {OH_PREMENOPAUSAL_RANGES.map((row) => (
            <tr key={row.category}>
              <td>{row.category}</td>
              <td>{row.range}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Shared Clasmo report shell matching the official 17 OH Progesterone letterhead PDF.
 * Letterhead + footer graphics are identical for every test; only title/params/notes change.
 */
export default function ClasmoReportSheet({
  title,
  sampleType = 'General',
  demographics = {},
  rows = [],
  isLive = false,
  isSample = true,
  loading = false,
  emptyMessage = 'No parameters for this test yet.',
  showReferenceColumn = true,
  footerNote = '',
  actions = null,
  linkedFiles = null,
  editable = false,
  values = {},
  onValueChange,
  reportNote = '',
  reportComments = '',
  clinicalSignificance = '',
  reportExtraSections = null,
}) {
  const displayTitle = formatReportTitle(title);
  const isOh = isOhProgesteroneTest(displayTitle);
  const rawSample = Array.isArray(sampleType) ? sampleType.join(', ') : (sampleType || '');
  const sampleLabel = (rawSample && rawSample !== 'General')
    ? rawSample
    : (isOh ? 'Serum' : (rawSample || 'General'));

  const extraSections = reportExtraSections && typeof reportExtraSections === 'object'
    ? Object.entries(reportExtraSections).filter(([, text]) => String(text || '').trim())
    : [];

  const clinicalCustom = (clinicalSignificance || '').trim();
  const clinicalParas = clinicalCustom
    ? clinicalCustom.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    : (isOh ? OH_CLINICAL_PARAS : []);

  const preparedRows = rows.filter((row) => {
    const hasDetail = Boolean(
      (row.unit || '').trim()
      || (row.method || '').trim()
      || (row.reference_range_male || row.reference_range || '').trim()
      || (row.reference_range_female || '').trim()
      || (row.reference_range_child || '').trim()
    );
    return hasDetail;
  });
  const sourceRows = preparedRows.length ? preparedRows : rows;

  const sheetRows = (!loading && !sourceRows.length && isOh)
    ? [{
      id: 'ohpg-default',
      parameter_name: displayTitle || '17 OH Progesterone',
      method: 'CLIA',
      unit: 'ng/mL',
      result: '',
    }]
    : sourceRows.map((row) => (
      isOh
        ? {
          ...row,
          method: row.method || 'CLIA',
          unit: row.unit || 'ng/mL',
          parameter_name: row.parameter_name || displayTitle,
        }
        : row
    ));

  const ptName = demoValue(demographics.patient_name);
  const ageSex = demoValue(demographics.age_gender || demographics.age_display);
  const refBy = demoValue(demographics.doctor_name);
  const regNo = demoValue(demographics.lab_code);
  const barcode = demoValue(demographics.barcode);
  const regDate = demoValue(demographics.registration_date);
  const repDate = demoValue(demographics.reported_on);

  const sharedUnit = sheetRows.length
    && sheetRows.every((row) => (row.unit || '') === (sheetRows[0].unit || ''))
    ? (sheetRows[0].unit || '')
    : '';
  const rangeHeading = sharedUnit ? `RANGE (${sharedUnit})` : 'RANGE';
  const patientCategory = resolveReportCategory(demographics);

  return (
    <>
    <article className="clasmo-report-sheet clasmo-report-sheet--a4 clasmo-report-sheet--ohpg print-clasmo-report">
      <div className="clasmo-report-sidetext" aria-hidden="true">CLASMO DIAGNOSTICS</div>

      <header className="clasmo-report-letterhead">
        <img
          src={letterheadBanner}
          alt="Clasmo Diagnostics"
          className="clasmo-report-letterhead-banner"
        />
      </header>

      <div className="clasmo-report-status-row no-print">
        <strong>{isLive ? 'PATIENT REPORT' : (isSample ? 'SAMPLE REPORT' : 'LABORATORY REPORT')}</strong>
        <span>Official Clasmo letterhead — Print / PDF matches this format</span>
      </div>

      {linkedFiles}

      <div className="clasmo-report-body">
        <div className="clasmo-report-patient-block">
          <div className="clasmo-report-patient-col">
            <Field label="PT Name:" value={ptName.text} blank={ptName.blank} />
            <Field label="Age / Sex:" value={ageSex.text} blank={ageSex.blank} />
            <Field label="Ref By:" value={refBy.text} blank={refBy.blank} />
          </div>
          <div className="clasmo-report-patient-col">
            <Field label="Reg No:" value={regNo.text} blank={regNo.blank} />
            <Field label="Barcode:" value={barcode.text} blank={barcode.blank} />
            <Field label="INV:" value={displayTitle} blank={false} className="clasmo-report-field--inv" />
          </div>
          <div className="clasmo-report-patient-col">
            <Field label="Reg. Date:" value={regDate.text} blank={regDate.blank} />
            <Field label="Rep. Date:" value={repDate.text} blank={repDate.blank} />
            <Field label="Sample:" value={sampleLabel} blank={false} />
          </div>
        </div>

        <h3 className="clasmo-report-test-title">{displayTitle}</h3>
        <div className="clasmo-report-result-bar">TEST RESULT</div>

        {loading && <p className="clasmo-report-loading">Loading parameters…</p>}
        {!loading && !sheetRows.length && (
          <p className="clasmo-report-loading">{emptyMessage}</p>
        )}

        {!loading && sheetRows.length > 0 && (
          <table className={`clasmo-report-table${showReferenceColumn ? ' clasmo-report-table--with-ref' : ''}`}>
            <thead>
              <tr>
                <th>TEST DESCRIPTION</th>
                <th>RESULT</th>
                <th>UNITS</th>
                {showReferenceColumn && <th>BIOLOGICAL REFERENCE RANGE</th>}
              </tr>
            </thead>
            <tbody>
              {sheetRows.map((row) => {
                const key = row.id || row.parameter_id || row.parameter_name;
                return (
                  <tr key={key}>
                    <td>
                      <span className="clasmo-report-param-name">{row.parameter_name}</span>
                      {row.method ? <div className="clasmo-report-method">METHOD: {row.method}</div> : null}
                      {row.flag ? <div className="clasmo-report-method">{row.flag}{row.source === 'machine' ? ' · Machine' : ''}</div> : null}
                    </td>
                    <td className="clasmo-report-result-cell">
                      {resultDisplay(row, editable, values, onValueChange, {
                        showSampleValues: !isSample && isLive,
                      })}
                    </td>
                    <td>{row.unit || ''}</td>
                    {showReferenceColumn && (
                      <td>{referenceInterval(row, demographics)}</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {isOh ? <OhReferenceTables /> : (
          !showReferenceColumn && (
            <ReferenceRangeTables
              rows={sheetRows}
              rangeHeading={rangeHeading}
              category={patientCategory}
            />
          )
        )}

        {reportNote ? (
          <div className="clasmo-report-clinical">
            <h4>NOTE</h4>
            <p style={{ whiteSpace: 'pre-wrap' }}>{reportNote}</p>
          </div>
        ) : null}

        {reportComments ? (
          <div className="clasmo-report-clinical">
            <h4>COMMENTS</h4>
            <p style={{ whiteSpace: 'pre-wrap' }}>{reportComments}</p>
          </div>
        ) : null}

        {extraSections.map(([heading, text]) => (
          <div key={heading} className="clasmo-report-clinical">
            <h4>{String(heading).toUpperCase()}</h4>
            <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>
          </div>
        ))}

        {clinicalParas.length > 0 ? (
          <div className="clasmo-report-clinical clasmo-report-clinical--plain">
            <h4>CLINICAL SIGNIFICANCE</h4>
            {clinicalParas.map((para) => (
              <p key={para.slice(0, 48)} style={{ whiteSpace: 'pre-wrap' }}>{para}</p>
            ))}
          </div>
        ) : null}
      </div>

      <footer className="clasmo-report-footer">
        <img
          src={footerBanner}
          alt="Clasmo Diagnostics contact"
          className="clasmo-report-footer-banner"
        />
      </footer>
    </article>

    {(footerNote || actions) ? (
      <div className="clasmo-report-screen-footer no-print">
        {footerNote ? <p>{footerNote}</p> : null}
        {actions ? <div className="clasmo-report-actions">{actions}</div> : null}
      </div>
    ) : null}
    </>
  );
}

function waitForImages(root) {
  const imgs = Array.from(root.querySelectorAll('img'));
  return Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return (img.decode?.().catch(() => {})
        || new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        }));
    }),
  );
}

function printClasmoReportInPlace() {
  const body = document.body;
  body.classList.add('printing-clasmo-report');
  const cleanup = () => {
    body.classList.remove('printing-clasmo-report');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
  window.setTimeout(cleanup, 1500);
}

/** Print / Save as PDF — official A4 Clasmo letterhead for every test. */
export async function printClasmoReport() {
  const root = document.querySelector('.print-clasmo-reports-root');
  const sheets = root
    ? Array.from(root.querySelectorAll('.print-clasmo-report'))
    : Array.from(document.querySelectorAll('.print-clasmo-report'));
  if (!sheets.length) {
    window.alert('No report sheet is ready to print.');
    return;
  }

  await Promise.all(sheets.map((sheet) => waitForImages(sheet)));

  const clones = sheets.map((sheet) => {
    const clone = sheet.cloneNode(true);
    clone.querySelectorAll('.no-print').forEach((node) => node.remove());
    clone.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src');
      if (src) img.setAttribute('src', new URL(src, window.location.href).href);
    });
    clone.querySelectorAll('input').forEach((input) => {
      input.setAttribute('value', input.value || '');
    });
    return clone.outerHTML;
  });

  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((node) => `<link rel="stylesheet" href="${node.href}">`)
    .join('\n');

  const printCss = `
    @page { size: A4 portrait; margin: 0; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      width: 210mm;
    }
    .no-print { display: none !important; }
    /* Block flow (not flex): Chrome orphans the letterhead when flex + break-inside:avoid. */
    .clasmo-report-sheet,
    .clasmo-report-sheet--a4 {
      width: 210mm !important;
      min-height: 297mm !important;
      height: auto !important;
      max-width: 210mm !important;
      margin: 0 !important;
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      overflow: visible !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
      background: #fff !important;
      display: block !important;
      position: relative !important;
      box-sizing: border-box !important;
    }
    .clasmo-report-sheet:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .clasmo-report-body {
      display: block !important;
      margin: 0 !important;
      padding: 0 0 28mm !important;
    }
    .clasmo-report-letterhead {
      margin: 0 !important;
      padding: 0 !important;
      page-break-after: avoid !important;
      break-after: avoid-page !important;
      page-break-inside: avoid !important;
    }
    .clasmo-report-letterhead-banner {
      display: block !important;
      width: 100% !important;
      height: auto !important;
      max-height: 28mm !important;
      object-fit: contain !important;
      object-position: left top !important;
    }
    .clasmo-report-footer-banner {
      display: block !important;
      width: 100% !important;
      height: auto !important;
      max-height: 26mm !important;
      object-fit: contain !important;
      object-position: bottom center !important;
    }
    /* Keep footer anchored to the bottom of each sheet. */
    .clasmo-report-sheet > .clasmo-report-footer {
      position: absolute !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .clasmo-report-sidetext {
      display: block !important;
      position: absolute !important;
      left: 1.5mm !important;
      top: 55mm !important;
      bottom: 35mm !important;
      writing-mode: vertical-rl !important;
      transform: rotate(180deg) !important;
      color: rgba(0, 0, 0, 0.45) !important;
      font-size: 9px !important;
      font-weight: 700 !important;
      letter-spacing: 0.22em !important;
    }
    .clasmo-report-patient-block {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 3px 10px !important;
      margin: 2mm 10mm 0 12mm !important;
      padding: 2.2mm 3mm !important;
      border: 1px solid #7ec8e0 !important;
      background: #eef8fc !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      page-break-before: avoid !important;
      break-before: avoid-page !important;
    }
    .clasmo-report-field {
      display: grid !important;
      grid-template-columns: 70px minmax(0, 1fr) !important;
      gap: 4px !important;
      font-size: 10px !important;
      line-height: 1.3 !important;
    }
    .clasmo-report-field-label { color: #000 !important; font-weight: 700 !important; }
    .clasmo-report-field--inv strong {
      font-size: 9.5px !important;
      line-height: 1.25 !important;
      overflow-wrap: break-word !important;
      word-break: break-word !important;
    }
    .clasmo-report-field strong.is-placeholder {
      border-bottom: none !important;
      min-height: 1em !important;
    }
    .clasmo-report-test-title {
      margin: 3.5mm 10mm 2mm 12mm !important;
      font-size: 18px !important;
      color: #000 !important;
      text-align: center !important;
      font-weight: 800 !important;
    }
    .clasmo-report-result-bar {
      margin: 0 10mm 0 12mm !important;
      padding: 2.5px 6px !important;
      font-size: 11px !important;
      font-weight: 800 !important;
      letter-spacing: 0.08em !important;
      text-align: center !important;
      background: #fff !important;
      color: #000 !important;
      border: 1px solid #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .clasmo-report-table {
      width: calc(100% - 22mm) !important;
      margin: 0 10mm 2.5mm 12mm !important;
      font-size: 11px !important;
      border-collapse: collapse !important;
    }
    .clasmo-report-ref-blocks {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 3mm !important;
      margin: 0 10mm 2.5mm 12mm !important;
    }
    .clasmo-report-ref-blocks--single {
      grid-template-columns: 1fr !important;
    }
    .clasmo-report-dual-ref {
      width: 100% !important;
      margin: 0 0 2.5mm !important;
      font-size: 10.5px !important;
      border-collapse: collapse !important;
    }
    .clasmo-report-dual-ref--single {
      width: calc(100% - 22mm) !important;
      margin: 0 10mm 2.5mm 12mm !important;
    }
    .clasmo-report-table th, .clasmo-report-table td,
    .clasmo-report-dual-ref th, .clasmo-report-dual-ref td {
      padding: 3px 6px !important;
      border: 1px solid #9ebed0 !important;
      vertical-align: top !important;
    }
    .clasmo-report-table th, .clasmo-report-dual-ref th {
      background: #d6eef7 !important;
      color: #000 !important;
      font-weight: 800 !important;
      text-align: left !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .clasmo-report-table th:nth-child(2),
    .clasmo-report-table td.clasmo-report-result-cell,
    .clasmo-report-table td:nth-child(2),
    .clasmo-report-table th:nth-child(3),
    .clasmo-report-table td:nth-child(3),
    .clasmo-report-table--with-ref th:nth-child(4),
    .clasmo-report-table--with-ref td:nth-child(4) {
      text-align: center !important;
    }
    .clasmo-report-dual-ref td:last-child { text-align: right !important; font-weight: 600 !important; }
    .clasmo-report-param-name { color: #000 !important; font-weight: 700 !important; }
    .clasmo-report-method {
      margin-top: 2px !important;
      font-size: 9px !important;
      color: #000 !important;
      text-transform: uppercase !important;
      font-weight: 600 !important;
    }
    .clasmo-report-clinical {
      margin: 0 10mm 2mm 12mm !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
      font-size: 9px !important;
      line-height: 1.35 !important;
    }
    .clasmo-report-clinical h4 {
      margin: 0 0 3px !important;
      font-size: 10.5px !important;
      color: #000 !important;
      text-decoration: underline !important;
      text-underline-offset: 2px !important;
      font-weight: 800 !important;
    }
    .clasmo-report-clinical p {
      margin: 0 0 2mm !important;
      text-align: justify !important;
    }
    .clasmo-report-status-row,
    .clasmo-report-screen-footer,
    .clasmo-report-loading { display: none !important; }
    .clasmo-report-result-input {
      border: none !important;
      background: transparent !important;
      font: inherit !important;
      width: 100%;
      text-align: center !important;
    }
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base href="${window.location.origin}/" />
  <title>Clasmo Diagnostics — Report</title>
  ${stylesheets}
  <style>${printCss}</style>
</head>
<body>
${clones.join('\n')}
<script>
(function () {
  function waitImages() {
    var imgs = Array.prototype.slice.call(document.images || []);
    return Promise.all(imgs.map(function (img) {
      if (img.complete) return Promise.resolve();
      return new Promise(function (resolve) {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));
  }
  function runPrint() {
    waitImages().then(function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 250);
    });
  }
  window.addEventListener('afterprint', function () {
    setTimeout(function () { window.close(); }, 200);
  });
  if (document.readyState === 'complete') runPrint();
  else window.addEventListener('load', runPrint);
})();
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    printClasmoReportInPlace();
    return;
  }

  const revoke = () => {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  };
  win.addEventListener('load', revoke, { once: true });
  window.setTimeout(revoke, 60000);
}
