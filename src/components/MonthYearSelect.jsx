import React from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthYearSelect({ value = '', onChange, disabled = false, id }) {
  // value format is "YYYY-MM"
  const [year, month] = value ? value.split('-') : ['', ''];

  const handleMonthChange = (e) => {
    const m = e.target.value;
    if (!m && !year) onChange('');
    else onChange(`${year || new Date().getFullYear()}-${m || '01'}`);
  };

  const handleYearChange = (e) => {
    const y = e.target.value;
    if (!y && !month) onChange('');
    else onChange(`${y || new Date().getFullYear()}-${month || '01'}`);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <select 
        className="form-input form-select" 
        value={month} 
        onChange={handleMonthChange} 
        disabled={disabled}
        id={id ? `${id}-month` : undefined}
      >
        <option value="">Month</option>
        {MONTHS.map((m, i) => {
          const val = (i + 1).toString().padStart(2, '0');
          return <option key={val} value={val}>{m}</option>;
        })}
      </select>
      <select 
        className="form-input form-select" 
        value={year} 
        onChange={handleYearChange} 
        disabled={disabled}
        id={id ? `${id}-year` : undefined}
      >
        <option value="">Year</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}
