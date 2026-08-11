export const popularJobTitles = [
  'Manager', 'Assistant Manager', 'Project Manager', 'Sales Manager',
  'Store Manager', 'Operations Manager', 'Cashier', 'Server',
  'Customer Service Representative', 'Retail', 'Software Engineer',
  'Data Analyst', 'Marketing Manager', 'Accountant', 'Teacher',
  'Nurse', 'Administrative Assistant', 'Graphic Designer',
  'Human Resources', 'Business Analyst',
];

export const workBulletPoints = {
  manager: {
    title: 'Manager',
    expert: [
      'Supervised a team of 15+ employees, providing mentorship and conducting performance reviews that improved team productivity by 20%.',
      'Developed and implemented operational strategies that reduced costs by 15% while maintaining service quality.',
      'Managed daily operations including scheduling, inventory management, and customer relations.',
      'Led cross-functional teams to execute projects on time and within budget.',
    ],
    regular: [
      'Self-motivated, with a strong sense of personal responsibility.',
      'Worked effectively in fast-paced environments.',
      'Skilled at working independently and collaboratively in a team environment.',
      'Proven ability to learn quickly and adapt to new situations.',
      'Managed workflow to meet deadlines consistently.',
    ],
  },
  'software engineer': {
    title: 'Software Engineer',
    expert: [
      'Designed and implemented scalable RESTful APIs serving 1M+ daily requests with 99.9% uptime.',
      'Led migration of legacy monolith to microservices architecture, reducing deployment time by 70%.',
      'Mentored 5 junior developers through code reviews, pair programming, and technical workshops.',
      'Optimized database queries resulting in 40% improvement in application response time.',
    ],
    regular: [
      'Developed and maintained web applications using modern JavaScript frameworks.',
      'Participated in agile development processes including daily standups and sprint planning.',
      'Wrote comprehensive unit and integration tests achieving 85% code coverage.',
      'Collaborated with cross-functional teams to define and implement new features.',
    ],
  },
  cashier: {
    title: 'Cashier',
    expert: [
      'Processed an average of 200+ customer transactions daily with 99.8% accuracy.',
      'Consistently exceeded sales targets by 15% through effective upselling techniques.',
      'Trained and mentored 10+ new cashiers on POS systems and customer service protocols.',
    ],
    regular: [
      'Handled cash, credit, and digital payment transactions efficiently.',
      'Maintained clean and organized checkout area.',
      'Provided excellent customer service and resolved complaints professionally.',
      'Assisted with inventory counts and restocking merchandise.',
    ],
  },
  teacher: {
    title: 'Teacher',
    expert: [
      'Developed differentiated curriculum for classes of 30+ students, resulting in a 25% improvement in standardized test scores.',
      'Implemented innovative classroom technology initiatives adopted school-wide.',
      'Mentored new teachers and led professional development workshops on modern pedagogical methods.',
    ],
    regular: [
      'Created engaging lesson plans aligned with state educational standards.',
      'Assessed student performance through tests, assignments, and observations.',
      'Maintained open communication with parents regarding student progress.',
      'Collaborated with fellow educators to develop interdisciplinary learning experiences.',
    ],
  },
  'customer service representative': {
    title: 'Customer Service Representative',
    expert: [
      'Resolved an average of 50+ customer inquiries per day with a 95% satisfaction rating.',
      'Developed knowledge base articles that reduced repeat call volume by 30%.',
      'Consistently ranked in the top 10% of team for first-call resolution metrics.',
    ],
    regular: [
      'Handled customer inquiries via phone, email, and live chat in a professional manner.',
      'Documented customer interactions and maintained accurate records in CRM system.',
      'Escalated complex issues to appropriate departments while ensuring customer follow-up.',
      'Participated in ongoing training to stay updated on products and services.',
    ],
  },
};

export const skillsSuggestions = {
  manager: {
    expert: ['Customer service', 'Team leadership', 'Time management', 'Decision-making'],
    regular: ['Verbal and written communication', 'Project management', 'Problem-solving', 'Strategic planning', 'Budgeting', 'Conflict resolution', 'Microsoft Office Suite', 'Employee training', 'Performance evaluation', 'Inventory management'],
  },
  'software engineer': {
    expert: ['JavaScript/TypeScript', 'React', 'Node.js', 'System Design'],
    regular: ['Python', 'SQL', 'Git', 'REST APIs', 'Agile/Scrum', 'Docker', 'AWS/Cloud', 'CI/CD', 'Unit Testing', 'Problem-solving'],
  },
  cashier: {
    expert: ['POS Systems', 'Cash Handling', 'Customer Service', 'Sales'],
    regular: ['Mathematics', 'Attention to Detail', 'Communication', 'Multitasking', 'Inventory Management', 'Team Collaboration'],
  },
  teacher: {
    expert: ['Curriculum Development', 'Classroom Management', 'Student Assessment', 'Differentiated Instruction'],
    regular: ['Lesson Planning', 'Communication', 'Patience', 'Technology Integration', 'Parent Relations', 'Data Analysis'],
  },
  default: {
    expert: ['Communication', 'Leadership', 'Problem-solving', 'Time management'],
    regular: ['Microsoft Office', 'Teamwork', 'Adaptability', 'Critical thinking', 'Organization', 'Attention to detail', 'Work ethic', 'Creativity', 'Interpersonal skills', 'Multitasking'],
  },
};

export const summarySuggestions = {
  manager: [
    'Dedicated professional with strong customer service and time management skills. Thrives in fast-paced environments, demonstrating adaptability and collaboration to drive team success.',
    'Motivated leader with proven skills in team collaboration and decision-making. Adept at fostering teamwork and enhancing customer experiences. Committed to delivering high-quality service in dynamic settings.',
    'Results-driven manager with 5+ years of experience leading diverse teams. Proven track record of improving operational efficiency and driving revenue growth through strategic planning and team development.',
  ],
  'software engineer': [
    'Passionate software engineer with expertise in full-stack development and system design. Experienced in building scalable applications using modern technologies. Strong advocate for clean code and best practices.',
    'Detail-oriented developer with a proven ability to deliver high-quality software solutions. Skilled in JavaScript, React, and cloud technologies with a focus on user experience and performance.',
  ],
  default: [
    'Dedicated professional with a strong work ethic and proven ability to deliver results. Adaptable team player with excellent communication skills and a commitment to continuous improvement.',
    'Enthusiastic and detail-oriented professional seeking to leverage skills and experience in a challenging new role. Known for reliability, initiative, and a positive attitude.',
    'Results-oriented professional with a demonstrated history of success. Strong analytical and problem-solving skills combined with excellent interpersonal abilities.',
  ],
};

export const certificationSuggestions = {
  'automation engineer': [
    'CAP – Certified Automation Professional',
    '[Area of certification] Training - [Timeframe]',
    '[Area of certification], [Company Name] - [Timeframe]',
    '[Area of expertise] License - [Timeframe]',
  ],
  'project manager': [
    'PMP – Project Management Professional',
    'CAPM – Certified Associate in Project Management',
    'CSM – Certified Scrum Master',
    'PRINCE2 Foundation/Practitioner',
  ],
  'software engineer': [
    'AWS Certified Solutions Architect',
    'Google Cloud Professional Cloud Architect',
    'Microsoft Azure Fundamentals (AZ-900)',
    'Certified Kubernetes Administrator (CKA)',
  ],
  default: [
    '[Area of certification] Training - [Timeframe]',
    '[Area of certification], [Company Name] - [Timeframe]',
    '[Area of expertise] License - [Timeframe]',
    'First Aid / CPR Certification',
  ],
};

export function searchSuggestions(category, query) {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  const data = {
    work: workBulletPoints,
    skills: skillsSuggestions,
    summary: summarySuggestions,
    certifications: certificationSuggestions,
  }[category];

  if (!data) return null;

  const match = Object.keys(data).find(key =>
    key.includes(q) || q.includes(key)
  );

  return data[match] || data.default || null;
}

export const relatedJobTitles = {
  manager: ['Assistant Manager', 'Project Manager', 'Sales Manager', 'Store Manager', 'Operations Manager'],
  'software engineer': ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer', 'QA Engineer'],
  cashier: ['Sales Associate', 'Retail Clerk', 'Customer Service Associate', 'Store Attendant'],
  teacher: ['Professor', 'Tutor', 'Teaching Assistant', 'Curriculum Developer', 'Education Coordinator'],
  default: ['Cashier', 'Customer Service Representative', 'Manager', 'Server', 'Retail'],
};
