import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

const CENTER_TYPE_OPTIONS = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
];

const PARTY_TYPE_OPTIONS = [
  { value: '', label: '--Select Type--' },
  { value: 'cash_party', label: 'Cash Party' },
  { value: 'credit_party', label: 'Credit Party' },
];

const FREQUENCY_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const BILLING_OPTIONS = [
  { value: 'prepaid', label: 'IsPrepaid' },
  { value: 'postpaid', label: 'IsPostpaid' },
  { value: 'none', label: 'None' },
];

const emptyForm = () => ({
  name: '',
  center_type: '',
  party_type: '',
  is_default: false,
  has_result_sms: false,
  report_print_exception: false,
  comment: '',
  mobile: '',
  email: '',
  address_line1: '',
  address_line2: '',
  address_line3: '',
  country: '',
  state: '',
  city: '',
  area: '',
  pincode: '',
  voucher_type: '',
  ledger_name: '',
  labcode_short_name: '',
  labcode: '',
  labcode_start: '',
  frequency: '',
  auto_increment: false,
  rate_master: '',
  credit_balance: '',
  credit_limit: '',
  invoice_payment_period_days: '',
  billing_type: 'none',
});

const emptyListFilters = () => ({
  name: '',
  center_type: '',
  area: '',
});

function rowToForm(row) {
  return {
    name: row.name || '',
    center_type: row.center_type || '',
    party_type: row.party_type || '',
    is_default: Boolean(row.is_default),
    has_result_sms: Boolean(row.has_result_sms),
    report_print_exception: Boolean(row.report_print_exception),
    comment: row.comment || '',
    mobile: row.mobile || '',
    email: row.email || '',
    address_line1: row.address_line1 || '',
    address_line2: row.address_line2 || '',
    address_line3: row.address_line3 || '',
    country: row.country || '',
    state: row.state || '',
    city: row.city || '',
    area: row.area || '',
    pincode: row.pincode || '',
    voucher_type: row.voucher_type || '',
    ledger_name: row.ledger_name || '',
    labcode_short_name: row.labcode_short_name || '',
    labcode: row.labcode || '',
    labcode_start: row.labcode_start || '',
    frequency: row.frequency || '',
    auto_increment: Boolean(row.auto_increment),
    rate_master: row.rate_master || '',
    credit_balance: row.credit_balance ?? '',
    credit_limit: row.credit_limit ?? '',
    invoice_payment_period_days: row.invoice_payment_period_days ?? '',
    billing_type: row.billing_type || 'none',
  };
}

function formToPayload(form) {
  return {
    name: form.name.trim(),
    center_type: form.center_type,
    party_type: form.party_type || '',
    is_default: form.is_default,
    has_result_sms: form.has_result_sms,
    report_print_exception: form.report_print_exception,
    comment: form.comment.trim(),
    mobile: form.mobile.trim(),
    email: form.email.trim(),
    address_line1: form.address_line1.trim(),
    address_line2: form.address_line2.trim(),
    address_line3: form.address_line3.trim(),
    country: form.country.trim(),
    state: form.state.trim(),
    city: form.city.trim(),
    area: form.area,
    pincode: form.pincode.trim(),
    voucher_type: form.voucher_type.trim(),
    ledger_name: form.ledger_name.trim(),
    labcode_short_name: form.labcode_short_name.trim(),
    labcode: form.labcode.trim(),
    labcode_start: form.labcode_start.trim(),
    frequency: form.frequency,
    auto_increment: form.auto_increment,
    rate_master: form.rate_master,
    credit_balance: form.credit_balance === '' ? 0 : Number(form.credit_balance),
    credit_limit: form.credit_limit === '' ? 0 : Number(form.credit_limit),
    invoice_payment_period_days: form.invoice_payment_period_days === ''
      ? 0
      : Number(form.invoice_payment_period_days),
    billing_type: form.billing_type || 'none',
  };
}

function exportCentersToCsv(rows) {
  const headers = [
    'Collection Center Name', 'Type', 'Collection Center Type', 'Default', 'Result SMS',
    'Mobile', 'Email', 'Address Line 1', 'City', 'Area', 'Pincode', 'Rate Master',
    'Credit Balance', 'Credit Limit', 'Billing Type',
  ];
  const lines = rows.map((row) => [
    row.name,
    row.center_type_display || row.center_type,
    row.party_type_display || row.party_type,
    row.is_default ? 'Yes' : 'No',
    row.has_result_sms ? 'Yes' : 'No',
    row.mobile,
    row.email,
    row.address_line1,
    row.city,
    row.area,
    row.pincode,
    row.rate_master,
    row.credit_balance,
    row.credit_limit,
    row.billing_type_display || row.billing_type,
  ].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'collection-centers.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function CollectionCenterManagement() {
  const [view, setView] = useState('form');
  const [centers, setCenters] = useState([]);
  const [areas, setAreas] = useState([]);
  const [rateMasters, setRateMasters] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [listFilters, setListFilters] = useState(emptyListFilters());
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadLookups = useCallback(async () => {
    const [centerData, areaData, rateData] = await Promise.all([
      api.getCollectionCenters(),
      api.getAreas(),
      api.getRateMasters(),
    ]);
    setCenters(centerData);
    setAreas(areaData);
    setRateMasters(rateData);
    return centerData;
  }, []);

  const loadCenters = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getCollectionCenters(listFilters);
      setCenters(data);
    } catch (err) {
      setError(err.message || 'Unable to load collection centers.');
      setCenters([]);
    } finally {
      setLoading(false);
    }
  }, [listFilters]);

  useEffect(() => {
    loadLookups().catch((err) => {
      setError(err.message || 'Unable to load collection center data.');
    }).finally(() => setLoading(false));
  }, [loadLookups]);

  useEffect(() => {
    if (view === 'list') {
      loadCenters();
    }
  }, [view, loadCenters]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setListFilter = (key, value) => setListFilters((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setSelectedCenterId('');
    setError('');
    setSuccess('');
  };

  const handleSelectCenter = (centerId) => {
    setSelectedCenterId(centerId);
    if (!centerId) {
      resetForm();
      return;
    }
    const row = centers.find((item) => String(item.id) === String(centerId));
    if (row) {
      setEditingId(row.id);
      setForm(rowToForm(row));
      setError('');
      setSuccess('');
    }
  };

  const handleAddNew = () => {
    resetForm();
    setView('form');
  };

  const handleSelectRow = (row) => {
    setEditingId(row.id);
    setSelectedCenterId(String(row.id));
    setForm(rowToForm(row));
    setView('form');
    setError('');
    setSuccess('');
  };

  const handleSave = async (isNew = false) => {
    if (!form.name.trim()) {
      setError('Collection center name is required.');
      return;
    }
    if (!form.center_type) {
      setError('Type is required.');
      return;
    }
    if (!form.address_line1.trim()) {
      setError('Address line 1 is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = formToPayload(form);
      if (editingId && !isNew) {
        const updated = await api.updateCollectionCenter(editingId, payload);
        setEditingId(updated.id);
        setSelectedCenterId(String(updated.id));
        setForm(rowToForm(updated));
        setSuccess('Collection center updated successfully.');
      } else {
        const created = await api.createCollectionCenter(payload);
        setEditingId(created.id);
        setSelectedCenterId(String(created.id));
        setForm(rowToForm(created));
        setSuccess('Collection center added successfully.');
      }
      await loadLookups();
      if (view === 'list') await loadCenters();
    } catch (err) {
      setError(err.message || 'Unable to save collection center.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (editingId) {
      const row = centers.find((item) => item.id === editingId);
      if (row) {
        setForm(rowToForm(row));
        setSelectedCenterId(String(row.id));
      } else {
        resetForm();
      }
    } else {
      resetForm();
    }
    setError('');
    setSuccess('');
  };

  const handleExportExcel = async () => {
    try {
      const data = await api.getCollectionCenters();
      exportCentersToCsv(data);
    } catch (err) {
      setError(err.message || 'Unable to export collection centers.');
    }
  };

  const filteredListCount = useMemo(() => centers.length, [centers]);

  return (
    <Layout activePage="administration">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/administration">Administration</Link></li>
            <li>Lab Management</li>
            <li>Collection Center</li>
          </ul>
        </nav>

        <section className="cc-mgmt-panel">
          <div className="cc-mgmt-header">
            <h2 className="change-password-title">Collection Center</h2>
            <div className="cc-mgmt-top-actions">
              <label className="cc-mgmt-toggle">
                <span>Report Print Exception</span>
                <input
                  type="checkbox"
                  checked={form.report_print_exception}
                  onChange={(event) => setField('report_print_exception', event.target.checked)}
                />
                <span className="cc-mgmt-toggle-slider" />
              </label>
              <button
                type="button"
                className="cc-mgmt-link-btn"
                onClick={() => setView(view === 'list' ? 'form' : 'list')}
              >
                {view === 'list' ? 'Collection Center Form' : 'Collection Center List'}
              </button>
              <button type="button" className="btn-outline btn-sm" onClick={handleExportExcel}>
                Collection Center Excel
              </button>
              <button type="button" className="btn-blue btn-sm" onClick={handleAddNew}>
                Add New Collection Centre
              </button>
            </div>
          </div>

          {view === 'form' ? (
            <form className="cc-mgmt-form" onSubmit={(event) => event.preventDefault()}>
              <div className="cc-mgmt-row">
                <label htmlFor="cc-select">Select Collection Center</label>
                <select
                  id="cc-select"
                  value={selectedCenterId}
                  onChange={(event) => handleSelectCenter(event.target.value)}
                >
                  <option value="">-- Select Collection Center --</option>
                  {centers.map((center) => (
                    <option key={center.id} value={center.id}>{center.name}</option>
                  ))}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-name">Collection Center Name <span className="required">*</span></label>
                <input
                  id="cc-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setField('name', event.target.value)}
                  placeholder="Collection Center Name"
                />
              </div>

              <div className="cc-mgmt-row">
                <label>Type <span className="required">*</span></label>
                <div className="cc-mgmt-radio-group">
                  {CENTER_TYPE_OPTIONS.map((option) => (
                    <label key={option.value} className="cc-mgmt-radio">
                      <input
                        type="radio"
                        name="center_type"
                        value={option.value}
                        checked={form.center_type === option.value}
                        onChange={(event) => setField('center_type', event.target.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-party-type">Collection Center Type</label>
                <select
                  id="cc-party-type"
                  value={form.party_type}
                  onChange={(event) => setField('party_type', event.target.value)}
                >
                  {PARTY_TYPE_OPTIONS.map((option) => (
                    <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-default">IsDefault Collection Center</label>
                <input
                  id="cc-default"
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(event) => setField('is_default', event.target.checked)}
                />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-sms">Having Result SMS</label>
                <input
                  id="cc-sms"
                  type="checkbox"
                  checked={form.has_result_sms}
                  onChange={(event) => setField('has_result_sms', event.target.checked)}
                />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-comment">Comment</label>
                <textarea
                  id="cc-comment"
                  rows={3}
                  value={form.comment}
                  onChange={(event) => setField('comment', event.target.value)}
                />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-mobile">Mobile No</label>
                <input id="cc-mobile" type="text" value={form.mobile} onChange={(event) => setField('mobile', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-email">Email</label>
                <input id="cc-email" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-address1">Address Line 1 <span className="required">*</span></label>
                <input id="cc-address1" type="text" value={form.address_line1} onChange={(event) => setField('address_line1', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-address2">Address Line 2</label>
                <input id="cc-address2" type="text" value={form.address_line2} onChange={(event) => setField('address_line2', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-address3">Address Line 3</label>
                <input id="cc-address3" type="text" value={form.address_line3} onChange={(event) => setField('address_line3', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-country">Country</label>
                <input id="cc-country" type="text" value={form.country} onChange={(event) => setField('country', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-state">State</label>
                <input id="cc-state" type="text" value={form.state} onChange={(event) => setField('state', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-city">City</label>
                <input id="cc-city" type="text" value={form.city} onChange={(event) => setField('city', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-area">Select Area</label>
                <select id="cc-area" value={form.area} onChange={(event) => setField('area', event.target.value)}>
                  <option value="">Select</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.name}>{area.name}</option>
                  ))}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-pincode">Pincode</label>
                <input id="cc-pincode" type="text" value={form.pincode} onChange={(event) => setField('pincode', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-voucher">Voucher Type</label>
                <input id="cc-voucher" type="text" value={form.voucher_type} onChange={(event) => setField('voucher_type', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-ledger">Ledger Name</label>
                <input id="cc-ledger" type="text" value={form.ledger_name} onChange={(event) => setField('ledger_name', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-short-name">LabCode ShortName</label>
                <input id="cc-short-name" type="text" value={form.labcode_short_name} onChange={(event) => setField('labcode_short_name', event.target.value)} />
              </div>

              <div className="cc-mgmt-row cc-mgmt-inline-row">
                <label htmlFor="cc-labcode">Labcode</label>
                <div className="cc-mgmt-inline-fields">
                  <input id="cc-labcode" type="text" value={form.labcode} onChange={(event) => setField('labcode', event.target.value)} />
                  <label htmlFor="cc-labcode-start" className="cc-mgmt-inline-label">Labcode Start</label>
                  <input id="cc-labcode-start" type="text" value={form.labcode_start} onChange={(event) => setField('labcode_start', event.target.value)} />
                </div>
              </div>

              <div className="cc-mgmt-row cc-mgmt-inline-row">
                <label htmlFor="cc-frequency">Frequency</label>
                <div className="cc-mgmt-inline-fields">
                  <select id="cc-frequency" value={form.frequency} onChange={(event) => setField('frequency', event.target.value)}>
                    {FREQUENCY_OPTIONS.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <label className="cc-mgmt-checkbox-inline">
                    <input
                      type="checkbox"
                      checked={form.auto_increment}
                      onChange={(event) => setField('auto_increment', event.target.checked)}
                    />
                    Auto Increment
                  </label>
                </div>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-rate-master">Select Rate Master</label>
                <select id="cc-rate-master" value={form.rate_master} onChange={(event) => setField('rate_master', event.target.value)}>
                  <option value="">Select Rate Master</option>
                  {rateMasters.map((rate) => (
                    <option key={rate.id} value={rate.name}>{rate.name}</option>
                  ))}
                </select>
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-credit-balance">Credit Balance</label>
                <input id="cc-credit-balance" type="number" step="0.01" value={form.credit_balance} onChange={(event) => setField('credit_balance', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-credit-limit">Credit Limit</label>
                <input id="cc-credit-limit" type="number" step="0.01" value={form.credit_limit} onChange={(event) => setField('credit_limit', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label htmlFor="cc-invoice-days">Invoice Payment Period (In Days)</label>
                <input id="cc-invoice-days" type="number" min="0" value={form.invoice_payment_period_days} onChange={(event) => setField('invoice_payment_period_days', event.target.value)} />
              </div>

              <div className="cc-mgmt-row">
                <label>Billing Type</label>
                <div className="cc-mgmt-radio-group">
                  {BILLING_OPTIONS.map((option) => (
                    <label key={option.value} className="cc-mgmt-radio">
                      <input
                        type="radio"
                        name="billing_type"
                        value={option.value}
                        checked={form.billing_type === option.value}
                        onChange={(event) => setField('billing_type', event.target.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {error && <p className="change-password-message error" role="alert">{error}</p>}
              {success && <p className="change-password-message success" role="status">{success}</p>}

              <div className="cc-mgmt-actions">
                <button type="button" className="btn-blue btn-sm" onClick={() => handleSave(true)} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Add'}
                </button>
                <button type="button" className="btn-blue btn-sm" onClick={() => handleSave(false)} disabled={submitting || !editingId}>
                  {submitting ? 'Saving...' : 'Update'}
                </button>
                <button type="button" className="btn-outline btn-sm" onClick={handleCancel} disabled={submitting}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="cc-mgmt-list">
              <div className="data-table-wrap master-table-wrap">
                <div className="ccb-table-meta">{filteredListCount} record{filteredListCount === 1 ? '' : 's'}</div>
                <div className="data-table-scroll">
                  <table className="data-table master-table">
                    <thead>
                      <tr>
                        <th>Collection Center Name</th>
                        <th>Type</th>
                        <th>Collection Center Type</th>
                        <th>Mobile No</th>
                        <th>City</th>
                        <th>Area</th>
                        <th>Rate Master</th>
                        <th>Default</th>
                      </tr>
                      <tr className="master-filter-row">
                        <th>
                          <input type="text" value={listFilters.name} onChange={(e) => setListFilter('name', e.target.value)} placeholder="Filter" />
                        </th>
                        <th>
                          <select value={listFilters.center_type} onChange={(e) => setListFilter('center_type', e.target.value)}>
                            <option value="">All</option>
                            {CENTER_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </th>
                        <th />
                        <th />
                        <th />
                        <th>
                          <input type="text" value={listFilters.area} onChange={(e) => setListFilter('area', e.target.value)} placeholder="Filter" />
                        </th>
                        <th />
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {loading && <tr><td colSpan={8} className="empty-msg">Loading...</td></tr>}
                      {!loading && centers.length === 0 && <tr><td colSpan={8} className="empty-msg">No records found.</td></tr>}
                      {!loading && centers.map((row) => (
                        <tr key={row.id} onClick={() => handleSelectRow(row)} className="cc-mgmt-list-row">
                          <td>{row.name}</td>
                          <td>{row.center_type_display || row.center_type || '—'}</td>
                          <td>{row.party_type_display || row.party_type || '—'}</td>
                          <td>{row.mobile || '—'}</td>
                          <td>{row.city || '—'}</td>
                          <td>{row.area || '—'}</td>
                          <td>{row.rate_master || '—'}</td>
                          <td>{row.is_default ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
