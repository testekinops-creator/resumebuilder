import { getTemplateById, getTemplateTheme } from '../../src/data/templates.js';

export const DOCX_FIXTURE_SIZES = Object.freeze(['small', 'medium', 'large', 'longText', 'customized']);

const WORK_BULLETS = [
  'Designed reliable service checks for customer journeys and documented measurable release outcomes.',
  'Validated Unicode examples such as café and naïve while improving accessible error messages.',
  'Partnered with product and engineering teams to prioritize critical release risks and acceptance evidence.',
  'Built maintainable browser and API checks that reduced manual regression effort across supported products.',
  'Created repeatable test data, reproducible defect reports, and concise release-readiness summaries.',
  'Mentored colleagues and reviewed automation changes for clarity, resilience, and useful diagnostics.',
];

function list(items) {
  return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
}

function copy(value) {
  if (Array.isArray(value)) return value.map(copy);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]));
  return value;
}

function merge(base, overrides) {
  const result = copy(base);
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return result;
  for (const [key, value] of Object.entries(overrides)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? merge(result[key] && typeof result[key] === 'object' && !Array.isArray(result[key]) ? result[key] : {}, value)
      : copy(value);
  }
  return result;
}

/**
 * Synthetic, deterministic resumes for both Word rendering and UI comparison.
 * Small targets one page, medium about two; actual page counts depend on the
 * template and viewer and are measured by the visual QA runner, not assumed.
 * Overrides merge nested records and replace arrays so customization tests can
 * change one setting without accidentally sharing mutable fixture objects.
 */
export function createDocxFixture(templateId, size = 'small', overrides = {}) {
  if (!DOCX_FIXTURE_SIZES.includes(size)) throw new RangeError(`Unknown DOCX fixture size: ${size}`);
  const template = getTemplateById(templateId);
  const theme = getTemplateTheme(template);
  const jobCount = size === 'large' ? 10 : size === 'medium' ? 5 : 1;
  const bulletCount = size === 'small' || size === 'longText' || size === 'customized' ? 3 : 6;
  const skills = ['Browser automation', 'API testing', 'Release planning', 'Accessible interfaces'];
  if (size === 'large' || size === 'medium') skills.push('Data validation', 'Quality strategy', 'Risk assessment', 'Performance testing');
  if (size === 'large') skills.push('Distributed systems', 'Observability', 'Continuous delivery', 'Stakeholder communication', 'Test architecture', 'SQL', 'JavaScript', 'Python');

  const state = {
    meta: { id: `docx-fixture-${templateId}-${size}`, name: 'My Resume', templateId },
    contact: {
      firstName: 'Alex', surname: 'Morgan', email: 'alex.morgan@example.com',
      phone: '+1 202 555 0146', city: 'Helsinki', country: 'Finland', pinCode: '00100',
      linkedIn: '', website: '', drivingLicence: '',
    },
    summary: { content: '<p>Quality engineer translating complex product requirements into reliable, accessible software and clear release decisions.</p>' },
    workHistory: Array.from({ length: jobCount }, (_, index) => ({
      id: `fixture-work-${index + 1}`,
      jobTitle: index === 0 ? 'Senior Quality Engineer' : `Quality Engineer ${index + 1}`,
      employer: index === 0 ? 'Northstar Example Systems' : `Example Product Studio ${index + 1}`,
      location: 'Helsinki, Finland',
      startDate: index === 0 ? '2023-11' : `${2023 - index * 2}-05`,
      endDate: index === 0 ? '' : `${2025 - index * 2}-10`,
      currentJob: index === 0,
      description: list(WORK_BULLETS.slice(0, bulletCount).map((bullet, bulletIndex) => `${bullet} Initiative ${index + 1}.${bulletIndex + 1}.`)),
    })),
    education: [{
      id: 'fixture-education-1', degree: 'Bachelor of Science', fieldOfStudy: 'Computer Science',
      schoolName: 'Example City University', location: 'Helsinki', graduationDate: '2019-07',
      coursework: '',
    }],
    skills: {
      textContent: '', showRatings: false,
      ratings: skills.map((name, index) => ({ id: `fixture-skill-${index + 1}`, name, rating: 5 - index % 3 })),
    },
    websites: [{ id: 'fixture-site-1', url: 'https://portfolio.example.com/alex-morgan' }],
    personalDetails: { nationality: 'Finnish', dob: '', maritalStatus: '', gender: '', additionalInfo: [] },
    certifications: { content: '<p>Example Foundation Certificate in Software Testing</p>' },
    languages: [{ id: 'fixture-language-1', language: 'English' }, { id: 'fixture-language-2', language: 'Español' }],
    extraSections: {
      selected: ['custom-projects'],
      custom: [{
        id: 'custom-projects', title: 'Selected Projects',
        content: list(['Created an accessibility review toolkit for independently verifiable product checks.']),
      }],
    },
    design: {
      themePreset: theme.id,
      colorScheme: theme.colors.accent, headingColor: theme.colors.heading,
      sidebarColor: theme.colors.sidebar, dividerColor: theme.colors.divider,
      fontFamily: 'Inter', fontStyle: 'normal', sectionSpacing: 50, paragraphSpacing: 50,
      lineSpacing: 50, pageMargin: 32, headingLetterSpacing: 0.5, pageBorder: 'none',
      sectionTitles: {}, sectionOrder: [], sectionColumns: {}, templateLayouts: {},
    },
  };

  if (size === 'large') {
    state.education.push({
      id: 'fixture-education-2', degree: 'Master of Science', fieldOfStudy: 'Software Systems',
      schoolName: 'Example Institute of Technology', location: 'Tampere', graduationDate: '2021-05',
      coursework: '<p>Research project on maintainable distributed-service testing.</p>',
    });
    state.extraSections.custom.push(
      { id: 'custom-awards', title: 'Awards & Recognition', content: list(['Cross-team quality award for a measurable reduction in release defects.', 'Peer recognition for accessible technical training and mentoring.']) },
      { id: 'custom-community', title: 'Community Contributions', content: list(['Maintained example documentation for an open-source testing library.', 'Organized monthly workshops for early-career software engineers.', 'FINAL FIXTURE MARKER: all community content has been exported.']) },
    );
    state.extraSections.selected.push('custom-awards', 'custom-community');
  }

  if (size === 'longText') {
    state.contact.email = `${'alex.morgan.'.repeat(7)}quality@example.com`;
    state.contact.city = 'Greater Helsinki Metropolitan Product Engineering and Research District';
    state.workHistory[0].jobTitle = 'Principal Quality, Accessibility, and International Distributed Platform Reliability Engineering Lead';
    state.workHistory[0].employer = 'Northstar Example Technology, Research, Product Engineering and International Customer Operations Services';
    state.skills.ratings[0].name = 'End-to-end quality strategy across browser automation, distributed service observability, and international accessibility standards';
    state.websites[0].url = `https://portfolio.example.com/${'a-long-unbroken-portfolio-path-'.repeat(10)}final`;
    state.extraSections.custom[0].title = 'Selected Cross-Functional Product Engineering, Accessibility, and Community Impact Projects';
    state.extraSections.custom[0].content = list(['LONG TEXT FINAL MARKER: long headings and links must wrap within their selected column.']);
  }

  if (size === 'customized') {
    const sidebarDefaults = template.sectionDefaults?.sidebar || ['skills', 'languages', 'personalDetails', 'websites'];
    state.design.templateLayouts[templateId] = {
      sectionOrder: ['workHistory', 'custom-projects', 'skills', 'summary', 'education', 'languages', 'certifications', 'websites', 'personalDetails'],
      sectionColumns: {
        workHistory: 'main', 'custom-projects': 'sidebar', summary: 'main',
        skills: sidebarDefaults.includes('skills') ? 'main' : 'sidebar',
        education: sidebarDefaults.includes('education') ? 'main' : 'sidebar',
      },
    };
    state.design.sectionTitles = { workHistory: 'Career Milestones', skills: 'Practical Expertise' };
    state.extraSections.custom[0].title = 'Impact & Selected Systems';
    state.design.colorScheme = '#C026D3';
    state.design.headingColor = '#86198F';
    state.design.sidebarColor = '#701A75';
    state.design.dividerColor = '#E879F9';
    state.design.fontFamily = 'Georgia';
    state.design.fontStyle = 'large';
    state.design.pageBorder = 'medium';
    state.skills.showRatings = true;
  }

  return merge(state, overrides);
}
