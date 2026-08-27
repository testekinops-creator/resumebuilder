import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeTextQuality,
  buildIssueAction,
  createQualityIgnoreState,
  getResumeQualityReport,
  getResumeQualityReview,
  ignoreQualityFinding,
  replaceIssueInResume,
} from '../src/utils/resumeQuality.js';

test('review flags missing contact, summary, experience, and skills transparently', () => {
  const findings = getResumeQualityReview({ contact: {}, workHistory: [], education: [], skills: {} });
  assert.deepEqual(findings.slice(0, 4).map(finding => finding.id), ['name', 'email', 'summary', 'experience']);
  assert.ok(findings.some(finding => finding.id === 'skills'));
});

test('inline analysis detects resume typos and grammar without flagging technical vocabulary', () => {
  const findings = analyzeTextQuality('Automtion with Selenium, Playwright, Kubernetes and collabration. Worked on testing application!! he were responsible.', { plainText: true });
  assert.deepEqual(findings.filter(item => item.category === 'spelling').map(item => item.suggestions[0]), ['Automation', 'collaboration']);
  assert.equal(findings.some(item => /Selenium|Playwright|Kubernetes/.test(item.original)), false);
  assert.ok(findings.some(item => item.category === 'style' && item.suggestions.includes('Tested the application')));
  assert.ok(findings.some(item => item.title === 'Repeated punctuation'));
  assert.ok(findings.some(item => item.title === 'Possible subject-verb disagreement'));
  assert.ok(findings.some(item => item.title === 'Sentence starts with a lowercase word'));
});

test('quality report identifies inconsistent bullet punctuation', () => {
  const report = getResumeQualityReport({
    contact: { firstName: 'Alex', email: 'alex@example.com' },
    summary: { content: '<p>Focused quality engineer.</p>' },
    skills: { textContent: '<p>Selenium</p>' },
    education: [{ id: 'e1' }],
    workHistory: [{
      id: 'w1',
      jobTitle: 'QA Engineer',
      startDate: '2024-07',
      currentJob: true,
      description: '<ul><li>Validated customer payment journeys.</li><li>Automated regression coverage.</li><li>Improved release reporting</li></ul>',
    }],
    extraSections: { custom: [] },
  }, { ignoredFingerprints: [] });

  assert.ok(report.findings.some(finding => finding.title === 'Inconsistent bullet punctuation'));
});

test('quality report groups duplicate bullets, repeated verbs, and inconsistent dates', () => {
  const duplicate = '<ul><li>Developed automated regression tests for customer payment journeys.</li></ul>';
  const report = getResumeQualityReport({
    contact: { firstName: 'Alex', email: 'alex@example.com' },
    summary: { content: '<p>Focused quality engineer.</p>' },
    skills: { textContent: '<p>Selenium</p>' },
    education: [{ id: 'e1' }],
    workHistory: [
      { id: 'w1', jobTitle: 'QA Engineer', startDate: '2024-07', currentJob: true, description: duplicate },
      { id: 'w2', jobTitle: 'qa engineer', startDate: '07/2023', endDate: '06/2024', description: duplicate },
      { id: 'w3', jobTitle: 'Tester', startDate: '2021-01', endDate: '2023-06', description: '<ul><li>Developed maintainable API checks for release validation.</li></ul>' },
    ],
    extraSections: { custom: [] },
  }, { ignoredFingerprints: [] });

  assert.ok(report.counts.repetition >= 2);
  assert.ok(report.counts.consistency >= 2);
  assert.ok(report.score < 100);
  assert.match(report.disclaimer, /not an ATS ranking/i);
});

test('current-position labels do not create a false mixed-date warning', () => {
  const report = getResumeQualityReport({
    contact: { firstName: 'Alex', email: 'alex@example.com' },
    summary: { content: '<p>Focused quality engineer.</p>' },
    skills: { textContent: '<p>Selenium</p>' },
    education: [{ id: 'e1' }],
    workHistory: [{
      id: 'w1',
      jobTitle: 'QA Engineer',
      startDate: '2024-07',
      endDate: 'Present',
      currentJob: true,
      description: '<ul><li>Validated release quality across customer journeys.</li></ul>',
    }],
    extraSections: { custom: [] },
  }, { ignoredFingerprints: [] });

  assert.equal(report.findings.some(finding => finding.title === 'Mixed date formats'), false);
});

test('approved replacements are immutable and ignore state is explicit', () => {
  const state = {
    summary: { content: '<p>Strong collabration skills.</p>' },
    contact: { firstName: 'Alex' },
  };
  const finding = {
    fingerprint: 'spelling:test',
    fieldPath: 'summary.content',
    original: 'collabration',
    suggestions: ['collaboration'],
  };
  const next = replaceIssueInResume(state, finding, 'collaboration');
  assert.equal(state.summary.content, '<p>Strong collabration skills.</p>');
  assert.equal(next.summary.content, '<p>Strong collaboration skills.</p>');
  assert.equal(next.contact, state.contact);
  assert.deepEqual(buildIssueAction(finding), { type: 'APPLY_QUALITY_FIX', payload: { finding, replacement: 'collaboration' } });

  const ignored = ignoreQualityFinding(createQualityIgnoreState(), finding);
  assert.equal(ignored.has(finding.fingerprint), true);
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
