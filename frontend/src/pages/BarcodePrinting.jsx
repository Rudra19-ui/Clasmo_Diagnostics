import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { printBarcodeLabels } from '../utils/printBarcodes';

const PRINTER_FORMATS = ['TVSEBC', 'TSC', 'ZEBRA'];
const FORMAT_STORAGE_KEY = 'clasmo_barcode_printer_format';

export default function BarcodePrinting() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get('registrationId');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copies, setCopies] = useState(1);
  const [printerFormat, setPrinterFormat] = useState(() => localStorage.getItem(FORMAT_STORAGE_KEY) || 'TVSEBC');
  const [rememberFormat, setRememberFormat] = useState(true);
  const [selectedGroups, setSelectedGroups] = useState({});

  useEffect(() => {
    if (!registrationId) {
      setError('Missing registration id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    api.getBarcodeData(registrationId)
      .then((response) => {
        setData(response);
        const initialSelection = {};
        (response.groups || []).forEach((group) => {
          initialSelection[group.barcode] = true;
        });
        setSelectedGroups(initialSelection);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load barcode data.');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [registrationId]);

  const groups = useMemo(() => (
    (data?.groups || []).map((group) => ({
      ...group,
      selected: selectedGroups[group.barcode] !== false,
    }))
  ), [data, selectedGroups]);

  const toggleGroup = (barcode) => {
    setSelectedGroups((prev) => ({
      ...prev,
      [barcode]: !prev[barcode],
    }));
  };

  const toggleAll = () => {
    const allSelected = groups.every((group) => group.selected);
    const next = {};
    groups.forEach((group) => {
      next[group.barcode] = !allSelected;
    });
    setSelectedGroups(next);
  };

  const handlePrint = () => {
    if (!data) return;

    if (rememberFormat) {
      localStorage.setItem(FORMAT_STORAGE_KEY, printerFormat);
    }

    printBarcodeLabels({
      patientName: data.patient_name,
      ageSex: data.age_sex,
      labCode: data.lab_code,
      groups,
      copies,
      printerFormat,
    });
  };

  return (
    <div className="barcode-print-page">
      <div className="barcode-print-toolbar">
        <Link to="/search" className="barcode-print-back">← Back to Search</Link>
      </div>

      <h1 className="barcode-print-title">Barcode Printing</h1>

      {loading && <p className="barcode-print-message">Loading barcode details…</p>}
      {error && !loading && <p className="barcode-print-message barcode-print-message--error">{error}</p>}

      {!loading && !error && data && (
        <>
          <div className="barcode-print-info">
            <div><strong>Patient Name :</strong> {data.patient_name}</div>
            <div><strong>Age/Sex :</strong> {data.age_sex}</div>
            <div><strong>Lab Code :</strong> {data.lab_code}</div>
            <div><strong>RegnDate :</strong> {data.registration_date}</div>
          </div>

          <div className="barcode-print-controls">
            <label>
              No of Copies :
              <input
                type="number"
                min="1"
                max="20"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>

            <label>
              Printer Format :
              <select value={printerFormat} onChange={(e) => setPrinterFormat(e.target.value)}>
                {PRINTER_FORMATS.map((format) => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </label>

            <label className="barcode-print-remember">
              <input
                type="checkbox"
                checked={rememberFormat}
                onChange={(e) => setRememberFormat(e.target.checked)}
              />
              Remember Format
            </label>
          </div>

          <div className="barcode-print-table-wrap">
            <table className="barcode-print-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={groups.length > 0 && groups.every((group) => group.selected)}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Group Name</th>
                  <th>Barcode</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.barcode}>
                    <td>
                      <input
                        type="checkbox"
                        checked={group.selected}
                        onChange={() => toggleGroup(group.barcode)}
                      />
                    </td>
                    <td>{group.group_name}</td>
                    <td>{group.barcode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className="barcode-print-btn" onClick={handlePrint}>
            Print Barcode
          </button>
        </>
      )}

      {!loading && !registrationId && (
        <button type="button" className="barcode-print-btn" onClick={() => navigate('/search')}>
          Go to Search
        </button>
      )}
    </div>
  );
}
