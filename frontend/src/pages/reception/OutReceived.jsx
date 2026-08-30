import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';
import { QrScanButton } from '../../components/QrCameraScanner';
import { api } from '../../services/api';
import { sanitizeBarcodeScannedValue } from '../../utils/barcodeScan';

const STATUS_LABELS = {
  outsourced: 'Awaiting receive',
  received: 'Sample received',
  report_uploaded: 'Report uploaded',
};

function formatWhen(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function rowClassForStatus(status) {
  if (status === 'received') return 'outsource-row--received';
  if (status === 'report_uploaded') return 'outsource-row--report-uploaded';
  return '';
}

export default function OutReceived() {
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [barcode, setBarcode] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [receivingId, setReceivingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [rows, setRows] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await api.listOutsourceTransfers({ direction: 'incoming' });
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadList();
    inputRef.current?.focus();
  }, [loadList]);

  const receiveScan = useCallback(async (rawValue) => {
    const cleaned = sanitizeBarcodeScannedValue(rawValue ?? barcode);
    if (!cleaned) {
      setError('Scan or enter a barcode / QR number.');
      return;
    }

    setBarcode(cleaned);
    setReceiving(true);
    setError('');
    setMessage('');

    try {
      const updated = await api.receiveOutsourceTransfer({ barcode: cleaned });
      setMessage(`Received sample ${updated.lab_code} from ${updated.from_zone_name}.`);
      setBarcode('');
      await loadList();
    } catch (err) {
      setError(err.message || 'Could not receive sample.');
    } finally {
      setReceiving(false);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [barcode, loadList]);

  const handleReceiveRow = async (row) => {
    if (row.status !== 'outsourced') return;
    setReceivingId(row.id);
    setError('');
    setMessage('');
    try {
      const updated = await api.receiveOutsourceTransferById(row.id);
      setMessage(`Received sample ${updated.lab_code} from ${updated.from_zone_name}.`);
      await loadList();
    } catch (err) {
      setError(err.message || 'Could not receive sample.');
    } finally {
      setReceivingId(null);
    }
  };

  const handleUploadClick = (transferId) => {
    setUploadingId(transferId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !uploadingId) return;

    setError('');
    setMessage('');
    try {
      const updated = await api.uploadOutsourceReport(uploadingId, file);
      setMessage(`Report uploaded for ${updated.lab_code}.`);
      await loadList();
    } catch (err) {
      setError(err.message || 'Could not upload report.');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <Layout activePage="out-received">
      <main className="dash-main franchise-module-page">
        <header className="franchise-booking-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ul>
              <li><Link to="/dashboard">Home</Link></li>
              <li>Out Received</li>
            </ul>
          </nav>
          <h2 className="page-heading">Out Received</h2>
          <p className="portfolio-intro">
            Scan outsourced samples arriving at your zone. Rows turn yellow when received and green
            after the lab report is uploaded.
          </p>
        </header>

        <section className="franchise-module-panel">
          <div className="sample-scan-input-row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <input
              ref={inputRef}
              type="text"
              className="field-highlight-barcode sample-scan-input"
              value={barcode}
              placeholder="Scan barcode to receive outsourced sample"
              onChange={(e) => {
                setBarcode(sanitizeBarcodeScannedValue(e.target.value));
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  receiveScan(e.currentTarget.value);
                }
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <QrScanButton label="Scan QR" title="Scan barcode or QR with camera" onScan={receiveScan} />
            <button
              type="button"
              className="btn-primary"
              onClick={() => receiveScan(barcode)}
              disabled={receiving}
            >
              {receiving ? 'Receiving…' : 'Receive sample'}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />

          {error && <p className="login-error" role="alert">{error}</p>}
          {message && <p className="form-success-msg">{message}</p>}
        </section>

        <section className="franchise-module-panel">
          <h3 className="test-addition-subtitle">Incoming outsource samples</h3>
          {loadingList ? (
            <p>Loading…</p>
          ) : rows.length === 0 ? (
            <p>No incoming outsource transfers.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table outsource-table">
                <thead>
                  <tr>
                    <th>Book ID</th>
                    <th>Patient</th>
                    <th>Barcode</th>
                    <th>Tests</th>
                    <th>From zone</th>
                    <th>Status</th>
                    <th>Received at</th>
                    <th>Report</th>
                    <th>Received</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={rowClassForStatus(row.status)}>
                      <td>{row.lab_code}</td>
                      <td>{row.patient_name || '—'}</td>
                      <td>{row.barcode || '—'}</td>
                      <td>{(row.tests_list || []).join(', ') || '—'}</td>
                      <td>{row.from_zone_name || '—'}</td>
                      <td>{STATUS_LABELS[row.status] || row.status}</td>
                      <td>{formatWhen(row.received_at)}</td>
                      <td>
                        {row.report_file_url ? (
                          <a href={row.report_file_url} target="_blank" rel="noreferrer">View</a>
                        ) : '—'}
                      </td>
                      <td>
                        {row.status === 'outsourced' ? (
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleReceiveRow(row)}
                            disabled={receivingId === row.id}
                          >
                            {receivingId === row.id ? 'Receiving…' : 'Received'}
                          </button>
                        ) : '—'}
                      </td>
                      <td>
                        {row.status === 'received' && (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleUploadClick(row.id)}
                            disabled={uploadingId === row.id}
                          >
                            {uploadingId === row.id ? 'Uploading…' : 'Upload report'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
