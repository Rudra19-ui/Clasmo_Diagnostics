import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { printBillReceipt } from '../utils/printBillReceipt';
import '../styles/bill-receipt.css';

const DISCOUNT_REASONS = [
  { value: '', label: 'Select Discount Reason...' },
  { value: 'Staff', label: 'Staff' },
  { value: 'Corporate', label: 'Corporate' },
  { value: 'Camp', label: 'Camp' },
  { value: 'Senior Citizen', label: 'Senior Citizen' },
  { value: 'Referral', label: 'Referral' },
];

const AUTHORIZATIONS = [
  { value: '', label: 'Select Authorized By' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Director', label: 'Director' },
  { value: 'Lab Incharge', label: 'Lab Incharge' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'debit', label: 'Debit Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'others', label: 'Other' },
];

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function applyFormState(data) {
  return {
    discountTest: num(data.discount_test),
    discountRegn: num(data.discount_regn),
    discountType: data.discount_type || 'Amt',
    discountReason: data.discount_reason || '',
    discountAuthorization: data.discount_authorization || '',
    visitingCharges: num(data.visiting_charges),
    paid: num(data.paid),
    refundAmount: num(data.refund_amount),
    paymentMethod: data.payment_method || 'cash',
    billReceiptNo: data.bill_receipt_no || '',
    payBalance: '',
  };
}

export default function BillReceipt() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get('registrationId');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [discountTest, setDiscountTest] = useState(0);
  const [discountRegn, setDiscountRegn] = useState(0);
  const [discountType, setDiscountType] = useState('Amt');
  const [discountReason, setDiscountReason] = useState('');
  const [discountAuthorization, setDiscountAuthorization] = useState('');
  const [visitingCharges, setVisitingCharges] = useState(0);
  const [paid, setPaid] = useState(0);
  const [refundAmount, setRefundAmount] = useState(0);
  const [payBalance, setPayBalance] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [billReceiptNo, setBillReceiptNo] = useState('');
  const [showTestDetails, setShowTestDetails] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [discountReasonOptions, setDiscountReasonOptions] = useState(DISCOUNT_REASONS);
  const [authorizationOptions, setAuthorizationOptions] = useState(AUTHORIZATIONS);

  useEffect(() => {
    api.getDiscountReasons()
      .then((reasons) => {
        if (!reasons.length) return;
        setDiscountReasonOptions([
          { value: '', label: 'Select Discount Reason...' },
          ...reasons.map((item) => ({ value: item.reason, label: item.reason })),
        ]);
      })
      .catch(() => {});

    api.getDiscountAuthorities()
      .then((authorities) => {
        if (!authorities.length) return;
        setAuthorizationOptions([
          { value: '', label: 'Select Authorized By' },
          ...authorities.map((item) => ({
            value: item.authorization_name,
            label: item.authorization_name,
          })),
        ]);
      })
      .catch(() => {});
  }, []);

  const loadBillReceipt = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await api.getBillReceipt(id);
      setData(response);
      const form = applyFormState(response);
      setDiscountTest(form.discountTest);
      setDiscountRegn(form.discountRegn);
      setDiscountType(form.discountType);
      setDiscountReason(form.discountReason);
      setDiscountAuthorization(form.discountAuthorization);
      setVisitingCharges(form.visitingCharges);
      setPaid(form.paid);
      setRefundAmount(form.refundAmount);
      setPaymentMethod(form.paymentMethod);
      setBillReceiptNo(form.billReceiptNo);
      setPayBalance('');
    } catch (err) {
      setError(err.message || 'Failed to load bill receipt.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!registrationId) {
      setError('Missing registration id.');
      setLoading(false);
      return;
    }
    loadBillReceipt(registrationId);
  }, [registrationId, loadBillReceipt]);

  const subTotal = useMemo(
    () => (data?.tests || []).reduce((sum, test) => sum + num(test.price), 0),
    [data],
  );

  const effectiveDiscountRegn = useMemo(() => {
    if (discountType === '%') {
      return (subTotal * num(discountRegn)) / 100;
    }
    return num(discountRegn);
  }, [discountRegn, discountType, subTotal]);

  const charges = subTotal - num(discountTest);
  const netAmount = subTotal - num(discountTest) - effectiveDiscountRegn + num(visitingCharges);
  const balance = netAmount - num(paid);

  const buildPayload = () => ({
    registration_id: data.registration_id,
    discount_test: num(discountTest),
    discount_regn: effectiveDiscountRegn,
    discount_type: discountType,
    discount_reason: discountReason,
    discount_authorization: discountAuthorization,
    visiting_charges: num(visitingCharges),
    paid: num(paid),
    refund_amount: num(refundAmount),
    pay_balance: num(payBalance),
    payment_method: paymentMethod,
    bill_receipt_no: billReceiptNo,
  });

  const buildPrintBill = () => ({
    tests: data?.tests || [],
    total: subTotal,
    discount: num(discountTest) + effectiveDiscountRegn,
    discount_test: num(discountTest),
    discount_regn: effectiveDiscountRegn,
    visiting_charges: num(visitingCharges),
    net_amount: netAmount,
    paid: num(paid) + num(payBalance),
    balance: netAmount - num(paid) - num(payBalance),
    refund_amount: num(refundAmount),
    bill_receipt_no: billReceiptNo,
    registration_date: data?.receipt_date || '',
    payment_method: paymentMethod,
    patient: data?.patient || {},
  });

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await api.saveBillReceipt(buildPayload());
      setData(response);
      const form = applyFormState(response);
      setDiscountTest(form.discountTest);
      setDiscountRegn(form.discountRegn);
      setDiscountType(form.discountType);
      setDiscountReason(form.discountReason);
      setDiscountAuthorization(form.discountAuthorization);
      setVisitingCharges(form.visitingCharges);
      setPaid(form.paid);
      setRefundAmount(form.refundAmount);
      setPaymentMethod(form.paymentMethod);
      setBillReceiptNo(form.billReceiptNo);
      setPayBalance('');
      setMessage('Bill receipt saved successfully.');
    } catch (err) {
      alert(err.message || 'Failed to save bill receipt.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!data) return;
    printBillReceipt(buildPrintBill(), data.patient?.name || '', data.lab_code, {
      show_header: showHeader,
      show_footer: true,
      show_test_details: showTestDetails,
      patient: data.patient,
    });
  };

  const handleClose = () => {
    navigate('/search');
  };

  return (
    <div className="bill-receipt-page">
      <div className="bill-receipt-toolbar">
        <Link to="/search" className="bill-receipt-back">← Back to Search</Link>
      </div>

      <div className="bill-receipt-panel">
        <div className="bill-receipt-header">
          <h1>Bill Receipt</h1>
          <button type="button" className="bill-receipt-close" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {loading && <p className="bill-receipt-message">Loading bill receipt…</p>}
        {error && !loading && <p className="bill-receipt-message bill-receipt-message--error">{error}</p>}
        {message && !loading && <p className="bill-receipt-message bill-receipt-message--success">{message}</p>}

        {!loading && !error && data && (
          <>
            <div className="bill-receipt-date">
              Date: {data.receipt_date}
            </div>

            <div className="bill-receipt-patient">
              <div className="bill-receipt-patient-col">
                <div><span>Name:</span> {data.patient.name}</div>
                <div><span>Address:</span> {data.patient.address || '—'}</div>
                <div><span>Contact:</span> {data.patient.mobile || '—'}</div>
              </div>
              <div className="bill-receipt-patient-col">
                <div><span>Gender:</span> {data.patient.gender}</div>
                <div><span>Email:</span> {data.patient.email || '—'}</div>
              </div>
              <div className="bill-receipt-patient-col">
                <div><span>Age:</span> {data.patient.age_display}</div>
                <div><span>Refered By:</span> {data.patient.doctor_name}</div>
              </div>
            </div>

            <div className="bill-receipt-table-wrap">
              <table className="bill-receipt-table">
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.tests || []).map((test) => (
                    <tr key={test.id}>
                      <td>{test.name}</td>
                      <td className="bill-receipt-num">{num(test.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bill-receipt-discount-bar">
              <label>
                Reason:
                <select value={discountReason} onChange={(e) => setDiscountReason(e.target.value)}>
                  {discountReasonOptions.map((option) => (
                    <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Authorisation:
                <select value={discountAuthorization} onChange={(e) => setDiscountAuthorization(e.target.value)}>
                  {authorizationOptions.map((option) => (
                    <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="bill-receipt-footer-grid">
              <div className="bill-receipt-payment">
                <span className="bill-receipt-payment-label">Payment Method:</span>
                <div className="bill-receipt-payment-options">
                  {PAYMENT_METHODS.map((method) => (
                    <label key={method.value}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === method.value}
                        onChange={() => setPaymentMethod(method.value)}
                      />
                      {method.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="bill-receipt-totals">
                <div className="bill-receipt-total-row">
                  <span>Discount (Test)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountTest}
                    onChange={(e) => setDiscountTest(e.target.value)}
                  />
                </div>
                <div className="bill-receipt-total-row">
                  <span>Sub Total</span>
                  <strong>{subTotal.toFixed(0)}</strong>
                </div>
                <div className="bill-receipt-total-row">
                  <span>Discount</span>
                  <div className="bill-receipt-discount-input">
                    <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                      <option value="Amt">Amt</option>
                      <option value="%">%</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountRegn}
                      onChange={(e) => setDiscountRegn(e.target.value)}
                    />
                  </div>
                </div>
                <div className="bill-receipt-total-row">
                  <span>Charges</span>
                  <input type="number" readOnly value={charges.toFixed(0)} />
                </div>
                <div className="bill-receipt-total-row">
                  <span>Visiting Charges</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={visitingCharges}
                    onChange={(e) => setVisitingCharges(e.target.value)}
                  />
                </div>
                <div className="bill-receipt-total-row">
                  <span>Net Amount</span>
                  <strong>{netAmount.toFixed(2)}</strong>
                </div>
                <div className="bill-receipt-total-row">
                  <span>Paid</span>
                  <strong>{num(paid).toFixed(2)}</strong>
                </div>
                <div className="bill-receipt-total-row">
                  <span>Balance</span>
                  <strong>{balance.toFixed(2)}</strong>
                </div>
                <div className="bill-receipt-total-row">
                  <span>Refund Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                </div>
                <div className="bill-receipt-total-row">
                  <span>Pay Balance</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payBalance}
                    onChange={(e) => setPayBalance(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="bill-receipt-options">
                  <label>
                    <input
                      type="checkbox"
                      checked={showTestDetails}
                      onChange={(e) => setShowTestDetails(e.target.checked)}
                    />
                    Show Test Details
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={showHeader}
                      onChange={(e) => setShowHeader(e.target.checked)}
                    />
                    Show Header
                  </label>
                </div>
                <div className="bill-receipt-total-row">
                  <span>Bill Receipt No.</span>
                  <input
                    type="text"
                    value={billReceiptNo}
                    onChange={(e) => setBillReceiptNo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bill-receipt-actions">
              <button type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={handlePrint}>Print Reciept</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
