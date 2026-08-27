import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { TEMPLATES } from '../src/data/templates.js';

async function loadPdfGenerator() {
  const sourceUrl = new URL('../src/utils/pdfGenerator.js', import.meta.url);
  const resumeSectionsUrl = new URL('../src/utils/resumeSections.js', import.meta.url).href;
  const resumeDatesUrl = new URL('../src/utils/resumeDates.js', import.meta.url).href;
  const source = await readFile(fileURLToPath(sourceUrl), 'utf8');
  const resolvableSource = source
    .replace("from 'jspdf'", `from '${import.meta.resolve('jspdf')}'`)
    .replace("from 'docx'", `from '${import.meta.resolve('docx')}'`)
    .replace("from './resumeSections'", `from '${resumeSectionsUrl}'`)
    .replace("from './resumeDates'", `from '${resumeDatesUrl}'`);
  return import(`data:text/javascript;base64,${Buffer.from(resolvableSource).toString('base64')}`);
}

function sampleState(templateId, long = false) {
  const workHistory = Array.from({ length: long ? 5 : 2 }, (_, index) => ({
    id: `work-${index}`,
    jobTitle: index ? 'Quality Engineer' : 'Senior Quality Automation Engineer for International Platforms',
    employer: index ? `Product Engineering Company ${index}` : 'Northstar Technology and Product Engineering Services',
    location: 'Bengaluru, India',
    startDate: `${2020 + index}-01`,
    endDate: index === 0 ? '' : `${2021 + index}-12`,
    currentJob: index === 0,
    description: `<ul>${Array.from({ length: long ? 7 : 3 }, (_, bulletIndex) => `<li>${[
      'Designed functional, regression, and integration suites for high-volume customer journeys.',
      'Validated APIs, Unicode data such as café and naïve, and error handling across releases.',
      'Collaborated with product, engineering, and design partners to improve measurable release quality.',
      'Automated browser and service checks with Selenium, Playwright, JavaScript, and RestAssured.',
      'Documented reproducible defects, release risks, test estimates, and traceable acceptance evidence.',
      'Reduced feedback time by prioritizing critical journeys and maintainable test data.',
      'Mentored engineers and presented concise quality updates to senior stakeholders.',
    ][bulletIndex]}</li>`).join('')}</ul>`,
  }));
  return {
    meta: { id: `qa-${templateId}`, name: `QA ${templateId}`, templateId },
    contact: { firstName: 'Deepak', surname: 'Hegde', email: 'deepak.long.address@example.com', phone: '+91 98765 43210', city: 'Bengaluru', country: 'India' },
    summary: { content: '<p>Results-focused automation professional who collaborates effectively with teams and stakeholders to improve reliable releases.</p>' },
    workHistory,
    education: [{ id: 'education-1', degree: 'Bachelor of Science', fieldOfStudy: 'Computer Science', schoolName: 'Nitte University College', graduationDate: '2019-07', coursework: '<p>Algorithms, software testing, distributed systems.</p>' }],
    skills: { showRatings: true, textContent: '', ratings: [
      { id: 'skill-1', name: 'Selenium WebDriver', rating: 5 }, { id: 'skill-2', name: 'Playwright and APIs', rating: 4 },
      { id: 'skill-3', name: 'Stakeholder Communication', rating: 4 }, { id: 'skill-4', name: 'Quality Strategy', rating: 5 },
    ] },
    websites: [{ id: 'site-1', url: 'https://portfolio.example.com/profiles/deepak-hegde/quality-engineering-and-automation' }],
    personalDetails: { nationality: 'Indian' },
    certifications: { content: '<p>ISTQB Certified Tester — Advanced Test Automation</p>' },
    languages: [{ id: 'language-1', language: 'English' }, { id: 'language-2', language: 'Português' }],
    extraSections: { selected: ['custom-projects'], custom: [{ id: 'custom-projects', title: 'Projects', content: '<p>Created a reusable accessibility and API quality platform used across product teams.</p>' }] },
    design: { colorScheme: '#2563EB', headingColor: '#1E3A8A', sidebarColor: '#1E40AF', dividerColor: '#93C5FD', fontFamily: 'Arial', fontStyle: 'normal', sectionSpacing: 50, paragraphSpacing: 50, templateLayouts: {} },
  };
}

const outputDirectory = fileURLToPath(new URL('../tmp/docx-qa/', import.meta.url));
await mkdir(outputDirectory, { recursive: true });
const { prepareDOCXExport } = await loadPdfGenerator();

for (const template of TEMPLATES) {
  const artifact = await prepareDOCXExport({ state: sampleState(template.id), resumeName: template.id });
  await writeFile(`${outputDirectory}/${template.id}.docx`, Buffer.from(await artifact.blob.arrayBuffer()));
}

for (const templateId of ['creative', 'metro']) {
  const artifact = await prepareDOCXExport({ state: sampleState(templateId, true), resumeName: `${templateId}-long` });
  await writeFile(`${outputDirectory}/${templateId}-long.docx`, Buffer.from(await artifact.blob.arrayBuffer()));
}

process.stdout.write(`Generated ${TEMPLATES.length + 2} DOCX QA files in ${outputDirectory}\n`);
