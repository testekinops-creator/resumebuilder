import assert from 'node:assert/strict';
import test from 'node:test';
import { formatResumeDateRange, formatResumeMonth } from '../src/utils/resumeDates.js';

test('formats normalized resume months as full month names', () => {
  assert.equal(formatResumeMonth('2022-11'), 'November 2022');
  assert.equal(formatResumeMonth('2026-07'), 'July 2026');
  assert.equal(formatResumeMonth('2021-05'), 'May 2021');
  assert.equal(
    formatResumeDateRange('2021-05', '2022-11'),
    'May 2021 - November 2022',
  );
});

test('normalizes current and present labels', () => {
  assert.equal(formatResumeMonth('Present'), 'Present');
  assert.equal(formatResumeMonth(' current '), 'Present');
  assert.equal(formatResumeDateRange('2022-11', 'Current'), 'November 2022 - Present');
  assert.equal(formatResumeDateRange('2022-11', '2024-02', true), 'November 2022 - Present');
});

test('preserves safe year-only and unrecognized imported values', () => {
  assert.equal(formatResumeMonth('2022'), '2022');
  assert.equal(formatResumeMonth('Spring 2022'), 'Spring 2022');
  assert.equal(formatResumeMonth('2022-13'), '2022-13');
  assert.equal(formatResumeMonth('2022-1'), '2022-1');
});

test('handles missing values without dangling separators or placeholders', () => {
  assert.equal(formatResumeMonth(), '');
  assert.equal(formatResumeMonth(null), '');
  assert.equal(formatResumeMonth({ year: 2022, month: 11 }), '');
  assert.equal(formatResumeMonth(Number.NaN), '');
  assert.equal(formatResumeMonth('  '), '');
  assert.equal(formatResumeDateRange('2022-11', ''), 'November 2022');
  assert.equal(formatResumeDateRange('', '2024-02'), 'February 2024');
  assert.equal(formatResumeDateRange('', '', true), 'Present');
  assert.equal(formatResumeDateRange('', ''), '');
});
