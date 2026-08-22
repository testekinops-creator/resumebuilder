const RESUME_MONTH_NAMES = Object.freeze([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]);

const PRESENT_DATE_PATTERN = /^(?:present|current)$/i;
const YEAR_MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const YEAR_PATTERN = /^\d{4}$/;

/**
 * Formats a normalized resume month for display without changing stored data.
 * Unknown or incomplete values are returned unchanged so imported resumes do
 * not silently lose information.
 */
export function formatResumeMonth(value) {
  if (value === undefined || value === null) return '';
  if (!['string', 'number'].includes(typeof value)) return '';
  if (typeof value === 'number' && !Number.isFinite(value)) return '';

  const source = String(value).trim();
  if (!source) return '';
  if (PRESENT_DATE_PATTERN.test(source)) return 'Present';
  if (YEAR_PATTERN.test(source)) return source;

  const match = source.match(YEAR_MONTH_PATTERN);
  if (!match) return source;

  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex >= RESUME_MONTH_NAMES.length) return source;
  return `${RESUME_MONTH_NAMES[monthIndex]} ${match[1]}`;
}

/**
 * Formats an optional start/end range and omits separators for missing values.
 * A current position always uses the single canonical label "Present".
 */
export function formatResumeDateRange(startDate, endDate, current = false) {
  const start = formatResumeMonth(startDate);
  const end = current ? 'Present' : formatResumeMonth(endDate);

  return [start, end].filter(Boolean).join(' - ');
}
