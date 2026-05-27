(function () {
  const TESTS = [
    { name: '24 HRS URINE PROTEIN', price: 350 },
    { name: 'ABSOLUTE EOSINOPHIL COUNT (AEC)', price: 180 },
    { name: 'ABSOLUTE LYMPHOCYTE COUNT', price: 200 },
    { name: 'ACID PHOSPHATASE', price: 250 },
    { name: 'ACTH', price: 1200 },
    { name: 'ADA (FLUID)', price: 450 },
    { name: 'AFB CULTURE', price: 600 },
    { name: 'ALBUMIN', price: 120 },
    { name: 'ALDEHYDE TEST', price: 150 },
    { name: 'ALKALINE PHOSPHATASE', price: 140 },
    { name: 'ALPHA FETO PROTEIN (AFP)', price: 800 },
    { name: 'AMYLASE', price: 280 },
    { name: 'ANA (ANTINUCLEAR ANTIBODY)', price: 950 },
    { name: 'ANTI CCP', price: 1100 },
    { name: 'ANTI HCV', price: 400 },
    { name: 'BLOOD SUGAR FASTING', price: 80 },
    { name: 'BLOOD SUGAR PP', price: 80 },
    { name: 'CBC (COMPLETE BLOOD COUNT)', price: 250 },
    { name: 'CREATININE', price: 120 },
    { name: 'HBA1C', price: 450 },
    { name: 'LIPID PROFILE', price: 650 },
    { name: 'LIVER FUNCTION TEST', price: 550 },
    { name: 'THYROID PROFILE', price: 750 },
    { name: 'URINE ROUTINE', price: 100 },
    { name: 'VITAMIN D', price: 1200 },
    { name: 'VITAMIN B12', price: 900 }
  ];

  const availableEl = document.getElementById('availableTests');
  const selectedEl = document.getElementById('selectedTests');
  const testSearch = document.getElementById('testSearch');
  const totalEl = document.getElementById('total');
  const netEl = document.getElementById('netAmount');
  const balanceEl = document.getElementById('balance');
  const paidEl = document.getElementById('paid');
  const visitingEl = document.getElementById('visiting');

  if (!availableEl) return;

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function formatDateTime(d) {
    return (
      pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
    );
  }

  const now = new Date();
  const regDate = document.getElementById('regDate');
  const collectionDate = document.getElementById('collectionDate');
  if (regDate) regDate.value = formatDateTime(now);
  if (collectionDate) collectionDate.value = formatDateTime(now);

  function renderAvailable(filter) {
    const q = (filter || '').toLowerCase();
    availableEl.innerHTML = '';
    TESTS.filter(function (t) {
      return !q || t.name.toLowerCase().includes(q);
    }).forEach(function (t, i) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = t.name;
      opt.dataset.price = t.price;
      availableEl.appendChild(opt);
    });
  }

  function getSelectedOptions(select) {
    return Array.from(select.selectedOptions);
  }

  function addTests(options) {
    options.forEach(function (opt) {
      const exists = Array.from(selectedEl.options).some(function (o) {
        return o.textContent.startsWith(opt.textContent.split('|')[0].trim());
      });
      if (exists) return;
      const price = parseFloat(opt.dataset.price) || 0;
      const row = document.createElement('option');
      row.value = opt.textContent;
      row.textContent = opt.textContent + ' | ₹' + price.toFixed(2) + ' | 0 | 0';
      row.dataset.price = price;
      selectedEl.appendChild(row);
    });
    updateTotals();
  }

  function updateTotals() {
    let sum = 0;
    Array.from(selectedEl.options).forEach(function (o) {
      sum += parseFloat(o.dataset.price) || 0;
    });
    const visiting = parseFloat(visitingEl?.value) || 0;
    const paid = parseFloat(paidEl?.value) || 0;
    const net = sum + visiting;
    if (totalEl) totalEl.value = sum.toFixed(2);
    if (netEl) netEl.value = net.toFixed(2);
    if (balanceEl) balanceEl.value = (net - paid).toFixed(2);
  }

  renderAvailable();

  if (testSearch) {
    testSearch.addEventListener('input', function () {
      renderAvailable(testSearch.value);
    });
  }

  document.getElementById('btnAdd')?.addEventListener('click', function () {
    addTests(getSelectedOptions(availableEl));
  });

  document.getElementById('btnAddAll')?.addEventListener('click', function () {
    addTests(Array.from(availableEl.options));
  });

  document.getElementById('btnRemove')?.addEventListener('click', function () {
    getSelectedOptions(selectedEl).forEach(function (o) { o.remove(); });
    updateTotals();
  });

  document.getElementById('btnRemoveAll')?.addEventListener('click', function () {
    selectedEl.innerHTML = '';
    updateTotals();
  });

  paidEl?.addEventListener('input', updateTotals);
  visitingEl?.addEventListener('input', updateTotals);

  document.getElementById('trfUpload')?.addEventListener('change', function (e) {
    const name = e.target.files[0]?.name || '';
    const el = document.getElementById('trfFileName');
    if (el) el.textContent = name;
  });

  document.getElementById('btnSave')?.addEventListener('click', function () {
    const patient = document.querySelector('[placeholder="Full name"]')?.value;
    if (!patient?.trim()) {
      alert('Please enter Patient Name (required).');
      return;
    }
    alert('Registration saved successfully!\nLab Code: ' + (document.getElementById('labCode')?.value || ''));
  });

  document.getElementById('btnProceed')?.addEventListener('click', function () {
    window.location.href = 'test-result.html';
  });

  document.getElementById('btnClear')?.addEventListener('click', function () {
    if (confirm('Clear all form data?')) {
      document.querySelectorAll('.dash-main input:not([readonly]), .dash-main textarea').forEach(function (el) {
        if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = el.defaultChecked;
        } else if (el.type !== 'file') {
          el.value = '';
        }
      });
      selectedEl.innerHTML = '';
      updateTotals();
    }
  });
})();
