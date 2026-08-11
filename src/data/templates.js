export const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Clean and professional, ideal for most industries',
    layout: '1-column',
    hasHeadshot: false,
    recommendedFor: ['3-5', '5-10', '10+'],
    defaultColor: '#6B21A8',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary design with a bold header',
    layout: '1-column',
    hasHeadshot: false,
    recommendedFor: ['1-3', '3-5'],
    defaultColor: '#2563EB',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Traditional format trusted by hiring managers',
    layout: '1-column',
    hasHeadshot: false,
    recommendedFor: ['5-10', '10+'],
    defaultColor: '#0F172A',
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Stand out with a unique, eye-catching layout',
    layout: '2-column',
    hasHeadshot: true,
    recommendedFor: ['none', '0-1'],
    defaultColor: '#059669',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple and elegant, lets your content shine',
    layout: '1-column',
    hasHeadshot: false,
    recommendedFor: ['1-3', '3-5'],
    defaultColor: '#475569',
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Sophisticated design for senior professionals',
    layout: '1-column',
    hasHeadshot: false,
    recommendedFor: ['10+'],
    defaultColor: '#1E3A5F',
  },
];

export const COLOR_SCHEMES = [
  { id: 'white', value: '#FFFFFF', label: 'White' },
  { id: 'gray', value: '#6B7280', label: 'Gray' },
  { id: 'navy', value: '#1E3A5F', label: 'Navy' },
  { id: 'purple', value: '#6B21A8', label: 'Purple' },
  { id: 'blue', value: '#2563EB', label: 'Blue' },
  { id: 'teal', value: '#0D9488', label: 'Teal' },
  { id: 'green', value: '#059669', label: 'Green' },
  { id: 'brown', value: '#92400E', label: 'Brown' },
  { id: 'pink', value: '#DB2777', label: 'Pink' },
  { id: 'red', value: '#DC2626', label: 'Red' },
  { id: 'yellow', value: '#D97706', label: 'Yellow' },
];

export const FONT_FAMILIES = [
  'Inter', 'Arial', 'Georgia', 'Times New Roman', 'Helvetica',
];

export const EXPERIENCE_LEVELS = [
  { id: 'none', label: 'No Experience', description: 'Student or recent graduate' },
  { id: '0-1', label: 'Less Than 1 Year', description: 'Entry level' },
  { id: '1-3', label: '1-3 Years', description: 'Early career' },
  { id: '3-5', label: '3-5 Years', description: 'Mid-level professional' },
  { id: '5-10', label: '5-10 Years', description: 'Experienced professional' },
  { id: '10+', label: '10+ Years', description: 'Senior / Executive' },
];

export const EDUCATION_LEVELS = [
  { id: 'vocational', label: 'Vocational', icon: '🎓' },
  { id: 'apprenticeship', label: 'Apprenticeship', icon: '🔧' },
  { id: 'associates', label: 'Associates', icon: '📚' },
  { id: 'bachelors', label: 'Bachelors', icon: '🎓' },
  { id: 'masters', label: 'Masters', icon: '📖' },
  { id: 'doctorate', label: 'Doctorate', icon: '🏛️' },
];

export const DEGREE_OPTIONS = [
  'High School Diploma', 'GED', 'Associate of Arts (AA)',
  'Associate of Science (AS)', 'Bachelor of Arts (BA)',
  'Bachelor of Science (BS)', 'Master of Arts (MA)',
  'Master of Science (MS)', 'MBA', 'Ph.D.',
  'M.D.', 'J.D.', 'Other',
];

export const EXTRA_SECTION_OPTIONS = [
  { id: 'personalDetails', label: 'Personal Details' },
  { id: 'websites', label: 'Websites, Portfolios, Profiles' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'languages', label: 'Languages', isNew: true },
  { id: 'accomplishments', label: 'Accomplishments' },
  { id: 'additionalInfo', label: 'Additional Information' },
  { id: 'affiliations', label: 'Affiliations' },
];
