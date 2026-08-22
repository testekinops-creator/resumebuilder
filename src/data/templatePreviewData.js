// A compact, content-rich resume used only for live template miniatures.
// It is rendered through ResumePreview, so the thumbnail and the selected
// resume always use the identical template component and layout rules.
export const TEMPLATE_PREVIEW_DATA = {
  meta: { templateId: 'classic' },
  contact: {
    firstName: 'Alex', surname: 'Morgan', city: 'Mumbai', country: 'India',
    email: 'alex.morgan@email.com', phone: '+91 98765 43210', linkedIn: '', website: '',
  },
  summary: { content: '<p>Results-focused professional who delivers clear, high-quality outcomes.</p>' },
  workHistory: [
    {
      id: 'sample-work-1', jobTitle: 'Product Specialist', employer: 'Northstar Co.', location: 'Mumbai',
      startDate: '2022', endDate: 'Present', currentJob: true,
      description: '<ul><li>Led projects from planning through delivery.</li><li>Improved processes with customer feedback.</li></ul>',
    },
    {
      id: 'sample-work-2', jobTitle: 'Operations Associate', employer: 'Harbor Labs', location: 'Mumbai',
      startDate: '2020', endDate: '2022', currentJob: false,
      description: '<ul><li>Coordinated priorities and stakeholder updates.</li></ul>',
    },
  ],
  education: [{ id: 'sample-education', degree: 'B.Sc.', fieldOfStudy: 'Business', schoolName: 'City University', graduationDate: '2022' }],
  skills: { textContent: '<ul><li>Communication</li><li>Leadership</li><li>Problem-solving</li><li>Project delivery</li><li>Stakeholder management</li><li>Process improvement</li></ul>', ratings: [] },
  extraSections: { selected: ['languages', 'websites', 'personalDetails'], custom: [] },
  personalDetails: { nationality: 'Indian', maritalStatus: 'Single' },
  websites: [{ id: 'sample-site', label: 'Portfolio', url: 'portfolio.example.com' }],
  certifications: { content: '' },
  languages: [
    { id: 'sample-language-1', language: 'English', level: 'Fluent' },
    { id: 'sample-language-2', language: 'Hindi', level: 'Fluent' },
    { id: 'sample-language-3', language: 'Marathi', level: 'Professional' },
  ],
  design: {
    colorScheme: '#6B21A8', fontStyle: 'normal', fontFamily: 'Inter', sectionSpacing: 50,
    paragraphSpacing: 50, lineSpacing: 50, pageMargin: 32, headingLetterSpacing: 0.5,
    sectionOrder: ['summary', 'skills', 'workHistory', 'education', 'languages', 'websites', 'personalDetails'],
  },
};
