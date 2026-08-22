import assert from 'node:assert/strict';
import test from 'node:test';
import { getResumeQualityReview } from '../src/utils/resumeQuality.js';

test('review flags missing contact, summary, experience, and skills transparently', () => {
  const findings = getResumeQualityReview({ contact: {}, workHistory: [], education: [], skills: {} });
  assert.deepEqual(findings.slice(0, 4).map(finding => finding.id), ['name', 'email', 'summary', 'experience']);
  assert.ok(findings.some(finding => finding.id === 'skills'));
});

test('review does not add completeness warnings for populated core sections', () => {
  const findings = getResumeQualityReview({
    contact: { firstName: 'Alex', email: 'alex@example.com' },
    summary: { content: '<p>Focused engineer.</p>' },
    skills: { textContent: '<ul><li>Testing</li></ul>' },
    workHistory: [{ id: 'w1', jobTitle: 'Engineer', startDate: '2023', currentJob: true, description: '<ul><li>Improved reliability.</li></ul>' }],
    education: [{ id: 'e1' }],
    extraSections: { custom: [] },
  });

  assert.equal(findings.some(finding => ['name', 'email', 'summary', 'experience', 'skills'].includes(finding.id)), false);
});
