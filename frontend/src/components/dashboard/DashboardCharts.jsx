function formatMoney(value) {
  const num = Number(value || 0);
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SummaryCard({ title, data }) {
  const rows = [
    ['Registration :', data?.registrations ?? 0, false],
    ['Total Amount :', `₹ ${formatMoney(data?.total_amount)}`, true],
    ['Paid Amount :', `₹ ${formatMoney(data?.paid_amount)}`, true],
    ['Balance Amount :', `₹ ${formatMoney(data?.balance_amount)}`, true],
    ['Amount After Discount :', `₹ ${formatMoney(data?.amount_after_discount)}`, true],
  ];

  return (
    <section className="elab-summary-card">
      <h3>{title}</h3>
      <table>
        <tbody>
          {rows.map(([label, value, isMoney]) => (
            <tr key={label}>
              <th>{label}</th>
              <td className={isMoney ? 'elab-summary-money' : ''}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function DonutChart({ segments, size = 180, money = true }) {
  const total = segments.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const radius = 70;
  const stroke = 28;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (!total) {
    return (
      <div className="elab-chart-empty">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#e8edf2" strokeWidth={stroke} />
        </svg>
        <p>No data</p>
      </div>
    );
  }

  return (
    <div className="elab-donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${center} ${center})`}>
          {segments.map((segment) => {
            const value = Number(segment.value || 0);
            const length = (value / total) * circumference;
            const dasharray = `${length} ${circumference - length}`;
            const circle = (
              <circle
                key={segment.label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={stroke}
                strokeDasharray={dasharray}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return circle;
          })}
        </g>
      </svg>
      <ul className="elab-donut-legend">
        {segments.map((segment) => (
          <li key={segment.label}>
            <span className="elab-legend-swatch" style={{ background: segment.color }} />
            {segment.label}
            <strong>
              {money ? `₹ ${formatMoney(segment.value)}` : Number(segment.value || 0)}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarChart({
  rows,
  valueKey = 'value',
  labelKey = 'label',
  color = '#5dade2',
  height = 220,
  money = false,
}) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);

  return (
    <div className={`elab-bar-chart${money ? ' elab-bar-money' : ''}`} style={{ height }}>
      {rows.length === 0 && <p className="elab-chart-empty-text">No data</p>}
      {rows.map((row) => {
        const value = Number(row[valueKey] || 0);
        const pct = (value / max) * 100;
        return (
          <div key={row[labelKey]} className="elab-bar-row">
            <div className="elab-bar-label" title={row[labelKey]}>{row[labelKey]}</div>
            <div className="elab-bar-track">
              <div className="elab-bar-fill" style={{ width: `${pct}%`, background: row.color || color }} />
            </div>
            <div className="elab-bar-value">{money ? `₹ ${formatMoney(value)}` : value}</div>
          </div>
        );
      })}
    </div>
  );
}

export function StackedBarChart({ segments, monthLabel, totalLabel }) {
  const total = segments.reduce((sum, item) => sum + Number(item.net_amount || 0), 0);
  const max = Math.max(total, 1);

  return (
    <div className="elab-stacked-chart">
      <div className="elab-stacked-axis">
        <span>{Math.round(max / 1000)}k</span>
        <span>{Math.round(max / 2000)}k</span>
        <span>0</span>
      </div>
      <div className="elab-stacked-body">
        <div className="elab-stacked-bar" style={{ height: `${Math.max((total / max) * 100, 4)}%` }}>
          {segments.map((segment) => {
            const pct = total ? (Number(segment.net_amount || 0) / total) * 100 : 0;
            return (
              <div
                key={segment.department}
                className="elab-stacked-segment"
                style={{ height: `${pct}%`, background: segment.color }}
                title={`${segment.department}: ₹${formatMoney(segment.net_amount)}`}
              />
            );
          })}
          {total > 0 && <span className="elab-stacked-total">{totalLabel || `${Math.round(total / 1000)}k`}</span>}
        </div>
        <div className="elab-stacked-month">{monthLabel}</div>
      </div>
      <ul className="elab-stacked-legend">
        {segments.map((segment) => (
          <li key={segment.department}>
            <span className="elab-legend-swatch" style={{ background: segment.color }} />
            {segment.department}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ComboChart({
  rows,
  barKey,
  lineKey,
  labelKey,
  barLabel = 'Net Amount',
  lineLabel = 'Registration Count',
}) {
  const barMax = Math.max(...rows.map((row) => Number(row[barKey] || 0)), 1);
  const lineMax = Math.max(...rows.map((row) => Number(row[lineKey] || 0)), 1);

  return (
    <div className="elab-combo-chart">
      {rows.length === 0 && <p className="elab-chart-empty-text">No data</p>}
      {rows.map((row) => {
        const barValue = Number(row[barKey] || 0);
        const lineValue = Number(row[lineKey] || 0);
        const barPct = (barValue / barMax) * 100;
        // Keep markers inside the plot area (never overlapping x-axis labels).
        const linePct = Math.min(100, (lineValue / lineMax) * 100);
        const pointBottom = lineValue > 0 ? `calc(${linePct}% - 5px)` : '0px';
        return (
          <div key={row[labelKey]} className="elab-combo-group">
            <div className="elab-combo-plot">
              <div className="elab-combo-bar-wrap">
                <div
                  className={`elab-combo-bar${barValue <= 0 ? ' is-empty' : ''}`}
                  style={{ height: barValue > 0 ? `${Math.max(barPct, 2)}%` : '0%' }}
                  title={`${barLabel}: ₹ ${formatMoney(barValue)}`}
                />
              </div>
              <div
                className="elab-combo-line-point"
                style={{ bottom: pointBottom }}
                title={`${lineLabel}: ${lineValue}`}
              />
            </div>
            <div className="elab-combo-label">{row[labelKey]}</div>
          </div>
        );
      })}
      <div className="elab-combo-legend">
        <span><i className="elab-legend-bar" /> {barLabel}</span>
        <span><i className="elab-legend-line" /> {lineLabel}</span>
      </div>
    </div>
  );
}

export function HistoryChart({ rows }) {
  const max = Math.max(...rows.map((row) => Number(row.registration_count || 0)), 1);

  return (
    <div className="elab-history-chart">
      {rows.length === 0 && <p className="elab-chart-empty-text">No history data</p>}
      {rows.map((row) => (
        <div key={row.label} className="elab-history-item">
          <div className="elab-history-bar" style={{ height: `${(Number(row.registration_count || 0) / max) * 100}%` }} />
          <span>{row.label}</span>
          <strong>{row.registration_count}</strong>
        </div>
      ))}
    </div>
  );
}

export { formatMoney };
