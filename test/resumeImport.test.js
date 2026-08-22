import assert from 'node:assert/strict';
import test from 'node:test';
import { classifySectionHeading, importedResumeHasContent, parseImportedResumeText } from '../src/utils/resumeImport.js';

test('imports core editable sections without merging raw text into HTML', () => {
  const result = parseImportedResumeText(`
Alex Morgan
alex@example.com | +1 555 010 1234

SUMMARY
Product-minded engineer focused on reliable customer experiences.

EXPERIENCE
Senior Software Engineer
Northstar Labs | January 2022 - Present
\u2022 Improved release reliability through automated testing.
\u2022 Partnered with design and support teams.

EDUCATION
Bachelor of Science in Computer Science
City University | May 2021

SKILLS
JavaScript, React, Accessibility | Testing
`);

  assert.equal(importedResumeHasContent(result), true);
  assert.deepEqual(result.patch.contact, {
    firstName: 'Alex', surname: 'Morgan', email: 'alex@example.com', phone: '+1 555 010 1234',
  });
  assert.match(result.patch.summary.content, /Product-minded engineer/);
  assert.match(result.patch.skills.textContent, /<li>JavaScript<\/li>/);
  assert.equal(result.patch.workHistory[0].jobTitle, 'Senior Software Engineer');
  assert.match(result.patch.workHistory[0].description, /<ul>/);
  assert.equal(result.patch.education[0].degree, 'Bachelor of Science in Computer Science');
});

test('escapes untrusted imported text before it enters rich text fields', () => {
  const result = parseImportedResumeText(`
Taylor Reed
SUMMARY
<script>alert('unsafe')</script> Built accessible products.
`);

  assert.match(result.patch.summary.content, /&lt;script&gt;/);
  assert.doesNotMatch(result.patch.summary.content, /<script>/);
});

test('keeps distinct dated experience entries editable after import', () => {
  const result = parseImportedResumeText(`
Morgan Taylor
EXPERIENCE
Staff Engineer
Northstar Labs | 2022 - Present
\u2022 Led the platform migration.
Software Engineer
Harbor Co. | 2019 - 2022
\u2022 Built accessible product features.
`);

  assert.equal(result.patch.workHistory.length, 2);
  assert.deepEqual(result.patch.workHistory.map(entry => entry.jobTitle), ['Staff Engineer', 'Software Engineer']);
  assert.deepEqual(result.patch.workHistory.map(entry => entry.employer), ['Northstar Labs', 'Harbor Co.']);
});

test('preserves optional and unknown headed sections as editable data', () => {
  const result = parseImportedResumeText(`
Jamie Lee
CONTACT
jamie@example.com | +1 555 010 2222
Austin, USA

SUMMARY
Accessible product designer.

CERTIFICATIONS
• Google UX Design Certificate

LANGUAGES
English — Fluent
Spanish — Conversational

PROJECTS
• Led an open-source accessibility audit.

VOLUNTEER EXPERIENCE
• Mentored early-career designers.
`);

  assert.equal(result.patch.contact.city, 'Austin');
  assert.match(result.patch.certifications.content, /Google UX/);
  assert.deepEqual(result.patch.languages.map(item => item.language), ['English', 'Spanish']);
  assert.ok(result.patch.extraSections.selected.includes('projects'));
  assert.equal(result.patch.extraSections.custom.length, 2);
  assert.equal(new Set(result.patch.extraSections.custom.map(section => section.id)).size, 2);
  assert.match(result.patch.extraSections.custom.find(section => section.id === 'projects').content, /open-source/);
  assert.match(result.patch.extraSections.custom.find(section => /volunteer/i.test(section.title)).content, /Mentored/);
});

test('normalizes section aliases only when their heading/content evidence supports it', () => {
  const aliases = [
    ['Career History', 'experience'],
    ['Employment History', 'experience'],
    ['Academic Qualifications', 'education'],
    ['Technical Proficiencies', 'skills'],
    ['Career Profile', 'summary'],
    ['Licenses & Certifications', 'certifications'],
    ['Honours', 'awards'],
    ['Selected Projects', 'projects'],
    ['My Career Journey', 'experience'],
    ['Academic Journey', 'education'],
    ['Certificates & Learning', 'certifications'],
  ];
  aliases.forEach(([heading, type]) => {
    const result = classifySectionHeading(heading, ['• JavaScript', '• Testing']);
    assert.equal(result?.canonicalType, type, heading);
    assert.equal(result?.originalTitle, heading);
  });
  assert.equal(classifySectionHeading('Strengths', ['A dependable colleague.']), null);
  assert.equal(classifySectionHeading('Strengths', ['• JavaScript', '• Testing'])?.canonicalType, 'skills');
  assert.equal(classifySectionHeading('My Toolbox', ['• JavaScript', '• Testing'])?.canonicalType, 'skills');
});

test('does not treat prose, dates, or GPA as unrelated resume fields', () => {
  const result = parseImportedResumeText(`
Morgan Lee
2021-11
GPA: 6.97/10

PROFILE
I have experience with Selenium while working in the education sector.

EDUCATION
Bachelor of Engineering in Information Science
NMAM Institute of Technology
GPA: 6.97/10

OPEN SOURCE CONTRIBUTIONS
• Maintained an accessibility package.
`);

  assert.notEqual(result.patch.contact.phone, '2021-11');
  assert.equal(result.patch.workHistory.length, 0);
  assert.match(result.patch.education[0].degree, /Bachelor of Engineering/);
  assert.match(result.patch.education[0].coursework, /GPA/);
  assert.equal(result.patch.extraSections.custom[0].title, 'OPEN SOURCE CONTRIBUTIONS');
});

test('infers clearly structured heading-less entries but flags them for review', () => {
  const result = parseImportedResumeText(`
Alex Morgan
alex@example.com
Software Engineer
Northstar Labs
2022-01 - Present
• Built reliable systems.
Bachelor of Science in Computer Science
City University
2021
`);

  assert.equal(result.patch.workHistory[0].jobTitle, 'Software Engineer');
  assert.equal(result.patch.education[0].degree, 'Bachelor of Science in Computer Science');
  assert.ok(result.review.needsReview.some(item => item.field === 'experience'));
  assert.ok(result.review.needsReview.some(item => item.field === 'education'));
});

test('imports the QA engineer regression fixture into the correct canonical fields', () => {
  const result = parseImportedResumeText(`
DEEPAK HEGDE
deepakhegde563@gmail.com | +91 94835 25007
Bengaluru, India 560100

PROFESSIONAL PROFILE
QA engineer focused on reliable, customer-focused software testing.

TECHNICAL PROFICIENCIES
Selenium, Java, TestNG, Jira, Manual Testing

CAREER HISTORY
Test Engineer
Ekinops Networks India Pvt. Ltd.
11/2022 - Current
• Built reliable regression coverage.

QA Engineer
Impelsys Pvt. Ltd.
05/2021 - 11/2022
• Verified releases with product teams.

Automation Test Engineer
Unilog Content Solutions Pvt. Ltd.
07/2018 - 04/2021
• Maintained automated test suites.

ACADEMIC QUALIFICATIONS
Bachelor of Engineering in Information Science and Engineering
NMAM Institute of Technology
GPA: 6.97/10
12th Grade
NSAM Pre University College

LANGUAGES KNOWN
English – Fluent
Hindi
Kannada
Tulu
`);

  assert.equal(result.patch.contact.firstName, 'DEEPAK');
  assert.equal(result.patch.contact.surname, 'HEGDE');
  assert.equal(result.patch.contact.phone, '+91 94835 25007');
  assert.equal(result.patch.contact.pinCode, '560100');
  assert.equal(result.patch.contact.phone === '2021-11', false);
  assert.equal(result.patch.workHistory.length, 3);
  assert.deepEqual(result.patch.workHistory.map(entry => entry.jobTitle), ['Test Engineer', 'QA Engineer', 'Automation Test Engineer']);
  assert.equal(result.patch.workHistory.some(entry => /GPA|12th Grade/i.test(entry.jobTitle)), false);
  assert.match(result.patch.education[0].degree, /Bachelor of Engineering/);
  assert.ok(result.patch.education.some(entry => /12th Grade/i.test(entry.degree)));
  assert.match(result.patch.skills.textContent, /Selenium/);
  assert.deepEqual(result.patch.languages.map(item => item.language), ['English', 'Hindi', 'Kannada', 'Tulu']);
  assert.ok(result.review.quality > 0);
});

test('keeps a multi-page section continuous while suppressing repeated page headers', () => {
  const result = parseImportedResumeText(`
Alex Morgan
alex@example.com

EXPERIENCE
Senior Engineer
Northstar Labs | January 2022 - Present
• Built reliable release automation.

Alex Morgan
• Partnered with support teams on incident prevention.
QA Engineer
Harbor Systems | May 2019 - December 2021
• Verified critical customer workflows.

EDUCATION
Bachelor of Science in Computer Science
City University | May 2019
`);

  assert.equal(result.patch.contact.firstName, 'Alex');
  assert.equal(result.patch.contact.surname, 'Morgan');
  assert.equal(result.patch.workHistory.length, 2);
  assert.match(result.patch.workHistory[0].description, /Partnered with support teams/);
  assert.equal(result.patch.workHistory.filter(entry => entry.jobTitle === 'Alex Morgan').length, 0);
});

test('does not import empty template prompts as real certifications or custom content', () => {
  const result = parseImportedResumeText(`
CERTIFICATIONS
Add any professional certifications, licenses, or training you've completed.

PUBLICATIONS
Add any professional certifications, licenses, or training you've completed.
`);

  assert.equal(result.patch.certifications.content, '');
  assert.deepEqual(result.patch.extraSections.custom, []);
});
