function cleanHeaderText(th) {
  const clone = th.cloneNode(true);
  clone.querySelectorAll('input, button, select, svg').forEach((node) => node.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

export function getTableHeaderLabels(table) {
  const headerRow = table.querySelector('thead tr:not(.trt-filter-row)');
  if (!headerRow) return [];
  return [...headerRow.querySelectorAll('th')].map((th, index) => {
    const text = cleanHeaderText(th);
    if (text) return text;
    if (th.querySelector('input[type="checkbox"]')) return 'Select';
    return `Column ${index + 1}`;
  });
}

export function applyTableDataLabels(table) {
  if (!table) return;

  const labels = getTableHeaderLabels(table);
  if (!labels.length) return;

  table.querySelectorAll('tbody tr').forEach((row) => {
    if (row.querySelector('.srt-empty, .trt-empty, .empty-msg, [colspan]')) return;

    [...row.querySelectorAll('td')].forEach((cell, index) => {
      if (labels[index]) {
        cell.dataset.label = labels[index];
      }
    });
  });

  table.classList.add('data-table-responsive');
}

export function applyResponsiveTables(root = document) {
  const scope = root.querySelector?.('#root') || root;
  scope.querySelectorAll('table').forEach((table) => {
    const rowCount = table.querySelectorAll('tbody tr').length;
    if (table.dataset.responsiveRows !== String(rowCount)) {
      delete table.dataset.responsiveRows;
    }

    if (table.dataset.responsiveRows === String(rowCount)) return;

    applyTableDataLabels(table);
    table.dataset.responsiveRows = String(rowCount);
  });
}
