import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDate, parseDDMMYYYY } from '../utils/date';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function buildCalendarCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = firstDay - 1; i >= 0; i -= 1) {
    cells.push({ day: daysInPrevMonth - i, monthOffset: -1, muted: true });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, monthOffset: 0, muted: false });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - firstDay - daysInMonth + 1, monthOffset: 1, muted: true });
  }

  return cells;
}

export default function DatePicker({ value, onChange, placeholder = 'DD-MM-YYYY', maxDate }) {
  const today = maxDate || new Date();
  const parsed = parseDDMMYYYY(value);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());
  const containerRef = useRef(null);

  const yearOptions = useMemo(() => {
    const end = today.getFullYear();
    return Array.from({ length: end - 1919 }, (_, i) => end - i);
  }, [today]);

  const cells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth]);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const openPicker = () => {
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
    setOpen(true);
  };

  const selectDate = (day, monthOffset) => {
    if (monthOffset !== 0) return;
    const selected = new Date(viewYear, viewMonth, day);
    if (selected > today) return;
    const formatted = formatDate(selected);
    setInputValue(formatted);
    onChange(formatted);
    setOpen(false);
  };

  const shiftMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleInputChange = (event) => {
    const next = event.target.value;
    setInputValue(next);
    if (!next) {
      onChange('');
      return;
    }
    const date = parseDDMMYYYY(next);
    if (date && date <= today) onChange(next);
  };

  const handleInputBlur = () => {
    const date = parseDDMMYYYY(inputValue);
    if (!inputValue) return;
    if (date && date <= today) {
      const formatted = formatDate(date);
      setInputValue(formatted);
      onChange(formatted);
      return;
    }
    setInputValue(value || '');
  };

  const isSelected = (day, monthOffset) => {
    if (!parsed || monthOffset !== 0) return false;
    return (
      parsed.getDate() === day &&
      parsed.getMonth() === viewMonth &&
      parsed.getFullYear() === viewYear
    );
  };

  const isToday = (day, monthOffset) => {
    if (monthOffset !== 0) return false;
    return (
      today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  return (
    <div className="date-picker" ref={containerRef}>
      <input
        type="text"
        className="date-picker-input"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={openPicker}
        onClick={openPicker}
      />
      {open && (
        <div className="date-picker-popup" role="dialog" aria-label="Choose date">
          <div className="date-picker-header">
            <button type="button" className="date-picker-nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              ‹
            </button>
            <select
              className="date-picker-month"
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index}>{name}</option>
              ))}
            </select>
            <select
              className="date-picker-year"
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button type="button" className="date-picker-nav" onClick={() => shiftMonth(1)} aria-label="Next month">
              ›
            </button>
          </div>
          <div className="date-picker-weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="date-picker-grid">
            {cells.map((cell, index) => {
              const disabled = cell.monthOffset !== 0 || new Date(viewYear, viewMonth, cell.day) > today;
              return (
                <button
                  key={`${cell.monthOffset}-${cell.day}-${index}`}
                  type="button"
                  className={[
                    'date-picker-day',
                    cell.muted ? 'muted' : '',
                    isSelected(cell.day, cell.monthOffset) ? 'selected' : '',
                    isToday(cell.day, cell.monthOffset) ? 'today' : '',
                  ].filter(Boolean).join(' ')}
                  disabled={disabled}
                  onClick={() => selectDate(cell.day, cell.monthOffset)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
