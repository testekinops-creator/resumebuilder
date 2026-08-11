export const RESUME_EXAMPLES = [
  {
    id: 'software-engineer',
    title: 'Software Engineer',
    category: 'Technology',
    icon: '💻',
    summary: 'Full-stack developer with 5+ years building scalable web applications',
    data: {
      contact: { firstName: 'Alex', surname: 'Chen', email: 'alex.chen@email.com', phone: '+1 (555) 123-4567', city: 'San Francisco', country: 'USA' },
      summary: { content: '<p>Full-stack software engineer with 5+ years of experience building high-performance web applications. Proficient in React, Node.js, and cloud architecture. Led teams of 4-8 developers, improving deployment frequency by 300%. Passionate about clean code and user-centric design.</p>' },
      workHistory: [
        { id: '1', jobTitle: 'Senior Software Engineer', employer: 'TechCorp', location: 'San Francisco, CA', startDate: '2021-03', currentJob: true, description: '<ul><li>Architected microservices platform serving 2M+ daily users with 99.9% uptime</li><li>Led migration from monolith to event-driven architecture, reducing latency by 40%</li><li>Mentored 4 junior developers through code reviews and pair programming</li></ul>' },
        { id: '2', jobTitle: 'Software Engineer', employer: 'StartupXYZ', location: 'Remote', startDate: '2019-01', endDate: '2021-02', description: '<ul><li>Built React dashboard processing 500K+ data points in real-time</li><li>Implemented CI/CD pipelines reducing deployment time from 2 hours to 15 minutes</li></ul>' },
      ],
      education: [{ id: '1', degree: 'B.S. Computer Science', schoolName: 'Stanford University', graduationDate: '2018' }],
      skills: { ratings: [{ id: '1', name: 'React' }, { id: '2', name: 'Node.js' }, { id: '3', name: 'TypeScript' }, { id: '4', name: 'AWS' }, { id: '5', name: 'PostgreSQL' }, { id: '6', name: 'Docker' }], textContent: '' },
    }
  },
  {
    id: 'product-manager',
    title: 'Product Manager',
    category: 'Management',
    icon: '📊',
    summary: 'Strategic product leader with track record of 0-to-1 product launches',
    data: {
      contact: { firstName: 'Sarah', surname: 'Johnson', email: 'sarah.j@email.com', phone: '+1 (555) 987-6543', city: 'New York', country: 'USA' },
      summary: { content: '<p>Results-driven Product Manager with 7 years of experience launching B2B SaaS products. Expert in user research, data-driven decision making, and cross-functional team leadership. Grew product revenue from $2M to $12M ARR in 18 months.</p>' },
      workHistory: [
        { id: '1', jobTitle: 'Senior Product Manager', employer: 'CloudSoft Inc.', location: 'New York, NY', startDate: '2020-06', currentJob: true, description: '<ul><li>Owned product roadmap for analytics suite generating $12M ARR</li><li>Increased user retention by 35% through data-driven feature prioritization</li><li>Coordinated 3 engineering squads (15 developers) for quarterly releases</li></ul>' },
      ],
      education: [{ id: '1', degree: 'MBA', schoolName: 'Columbia Business School', graduationDate: '2017' }],
      skills: { ratings: [{ id: '1', name: 'Product Strategy' }, { id: '2', name: 'User Research' }, { id: '3', name: 'Agile/Scrum' }, { id: '4', name: 'SQL & Analytics' }, { id: '5', name: 'Figma' }], textContent: '' },
    }
  },
  {
    id: 'graphic-designer',
    title: 'Graphic Designer',
    category: 'Creative',
    icon: '🎨',
    summary: 'Award-winning designer specializing in brand identity and digital media',
    data: {
      contact: { firstName: 'Maya', surname: 'Patel', email: 'maya@designstudio.com', phone: '+44 7700 900123', city: 'London', country: 'UK' },
      summary: { content: '<p>Creative graphic designer with 6+ years crafting compelling visual identities for Fortune 500 brands. Skilled in Adobe Creative Suite, motion graphics, and UI/UX design. Portfolio includes 50+ brand identity projects with 95% client satisfaction rate.</p>' },
      workHistory: [
        { id: '1', jobTitle: 'Senior Graphic Designer', employer: 'BrandWorks Agency', location: 'London, UK', startDate: '2020-01', currentJob: true, description: '<ul><li>Designed brand identities for 20+ clients including Nike, Spotify, and Airbnb</li><li>Won 3 industry awards for innovative campaign design</li><li>Managed design intern team of 4, establishing style guide standards</li></ul>' },
      ],
      education: [{ id: '1', degree: 'BA Fine Arts', schoolName: 'Royal College of Art', graduationDate: '2017' }],
      skills: { ratings: [{ id: '1', name: 'Adobe Photoshop' }, { id: '2', name: 'Illustrator' }, { id: '3', name: 'After Effects' }, { id: '4', name: 'Figma' }, { id: '5', name: 'Brand Identity' }], textContent: '' },
    }
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    category: 'Technology',
    icon: '📈',
    summary: 'ML engineer with expertise in NLP and predictive modeling',
    data: {
      contact: { firstName: 'James', surname: 'Wilson', email: 'james.w@datalab.com', phone: '+1 (555) 456-7890', city: 'Seattle', country: 'USA' },
      summary: { content: '<p>Data Scientist with 4+ years applying machine learning to solve complex business problems. Expertise in NLP, computer vision, and time-series forecasting. Published 3 papers in top-tier ML conferences. Reduced customer churn by 28% through predictive modeling.</p>' },
      workHistory: [
        { id: '1', jobTitle: 'Data Scientist', employer: 'DataDriven Inc.', location: 'Seattle, WA', startDate: '2021-01', currentJob: true, description: '<ul><li>Built NLP pipeline processing 1M+ customer reviews with 92% sentiment accuracy</li><li>Developed churn prediction model saving $4.2M annually in customer retention</li><li>Created automated A/B testing framework reducing experiment cycle time by 60%</li></ul>' },
      ],
      education: [{ id: '1', degree: 'M.S. Data Science', schoolName: 'University of Washington', graduationDate: '2020' }],
      skills: { ratings: [{ id: '1', name: 'Python' }, { id: '2', name: 'TensorFlow' }, { id: '3', name: 'SQL' }, { id: '4', name: 'Spark' }, { id: '5', name: 'Tableau' }], textContent: '' },
    }
  },
  {
    id: 'marketing-manager',
    title: 'Marketing Manager',
    category: 'Marketing',
    icon: '📣',
    summary: 'Growth marketer who scaled organic traffic from 10K to 500K monthly visits',
    data: {
      contact: { firstName: 'Emma', surname: 'Rodriguez', email: 'emma.r@growthco.com', phone: '+1 (555) 321-0987', city: 'Austin', country: 'USA' },
      summary: { content: '<p>Performance-driven Marketing Manager with 6 years of experience in B2B SaaS. Expert in content marketing, SEO, and demand generation. Scaled organic traffic by 4,900% and generated $8M in pipeline through integrated campaigns.</p>' },
      workHistory: [
        { id: '1', jobTitle: 'Marketing Manager', employer: 'GrowthCo', location: 'Austin, TX', startDate: '2020-03', currentJob: true, description: '<ul><li>Scaled organic traffic from 10K to 500K monthly visits through SEO strategy</li><li>Generated $8M in qualified pipeline through content marketing and webinars</li><li>Managed $500K annual ad budget across Google, LinkedIn, and Facebook</li></ul>' },
      ],
      education: [{ id: '1', degree: 'BA Marketing', schoolName: 'University of Texas', graduationDate: '2017' }],
      skills: { ratings: [{ id: '1', name: 'SEO/SEM' }, { id: '2', name: 'Content Strategy' }, { id: '3', name: 'Google Analytics' }, { id: '4', name: 'HubSpot' }, { id: '5', name: 'Copywriting' }], textContent: '' },
    }
  },
  {
    id: 'nurse',
    title: 'Registered Nurse',
    category: 'Healthcare',
    icon: '🏥',
    summary: 'Compassionate RN with ICU and emergency care experience',
    data: {
      contact: { firstName: 'David', surname: 'Kim', email: 'david.kim@hospital.org', phone: '+1 (555) 654-3210', city: 'Chicago', country: 'USA' },
      summary: { content: '<p>Dedicated Registered Nurse with 8 years of experience in ICU and emergency care. BLS, ACLS, and PALS certified. Known for exceptional patient advocacy and clinical assessment skills. Maintained 98% patient satisfaction scores across 3 hospital units.</p>' },
      workHistory: [
        { id: '1', jobTitle: 'ICU Registered Nurse', employer: 'Northwestern Memorial Hospital', location: 'Chicago, IL', startDate: '2019-06', currentJob: true, description: '<ul><li>Provided critical care to 4-6 patients per shift in 30-bed ICU</li><li>Reduced medication errors by 45% through implementation of barcode scanning protocol</li><li>Precepted 12 new graduate nurses, achieving 100% retention rate</li></ul>' },
      ],
      education: [{ id: '1', degree: 'BSN Nursing', schoolName: 'University of Illinois', graduationDate: '2016' }],
      skills: { ratings: [{ id: '1', name: 'Patient Care' }, { id: '2', name: 'IV Therapy' }, { id: '3', name: 'EMR Systems' }, { id: '4', name: 'Team Leadership' }, { id: '5', name: 'Crisis Management' }], textContent: '' },
    }
  },
  {
    id: 'teacher',
    title: 'High School Teacher',
    category: 'Education',
    icon: '📚',
    summary: 'Innovative educator with 10+ years improving student outcomes',
    data: {
      contact: { firstName: 'Lisa', surname: 'Thompson', email: 'lisa.t@school.edu', phone: '+1 (555) 789-0123', city: 'Portland', country: 'USA' },
      summary: { content: '<p>Passionate high school math teacher with 10 years of experience. Developed curriculum that increased AP Calculus pass rates from 62% to 91%. Committed to differentiated instruction and technology-integrated learning.</p>' },
      workHistory: [
        { id: '1', jobTitle: 'Math Teacher', employer: 'Lincoln High School', location: 'Portland, OR', startDate: '2017-08', currentJob: true, description: '<ul><li>Teach AP Calculus, Pre-Calculus, and Algebra II to 150+ students annually</li><li>Increased AP exam pass rate from 62% to 91% through flipped classroom model</li><li>Founded after-school STEM club with 40+ active members</li></ul>' },
      ],
      education: [{ id: '1', degree: 'M.Ed. Mathematics Education', schoolName: 'Portland State University', graduationDate: '2014' }],
      skills: { ratings: [{ id: '1', name: 'Curriculum Design' }, { id: '2', name: 'Differentiated Instruction' }, { id: '3', name: 'Google Classroom' }, { id: '4', name: 'Student Assessment' }], textContent: '' },
    }
  },
  {
    id: 'accountant',
    title: 'Senior Accountant',
    category: 'Finance',
    icon: '💰',
    summary: 'CPA with expertise in financial reporting and tax compliance',
    data: {
      contact: { firstName: 'Robert', surname: 'Miller', email: 'r.miller@finance.com', phone: '+1 (555) 456-1234', city: 'Boston', country: 'USA' },
      summary: { content: '<p>CPA-certified Senior Accountant with 7 years of experience in corporate financial reporting and tax compliance. Managed month-end close for $200M revenue company. Expert in GAAP, SOX compliance, and ERP systems.</p>' },
      workHistory: [
        { id: '1', jobTitle: 'Senior Accountant', employer: 'FinanceGroup LLC', location: 'Boston, MA', startDate: '2019-04', currentJob: true, description: '<ul><li>Manage month-end close process for $200M revenue organization</li><li>Reduced close cycle from 12 days to 5 days through process automation</li><li>Led SOX compliance audit with zero material findings for 3 consecutive years</li></ul>' },
      ],
      education: [{ id: '1', degree: 'B.S. Accounting', schoolName: 'Boston University', graduationDate: '2016' }],
      skills: { ratings: [{ id: '1', name: 'GAAP' }, { id: '2', name: 'SAP' }, { id: '3', name: 'Advanced Excel' }, { id: '4', name: 'Tax Compliance' }, { id: '5', name: 'Financial Analysis' }], textContent: '' },
    }
  },
];

export const EXAMPLE_CATEGORIES = ['All', 'Technology', 'Management', 'Creative', 'Marketing', 'Healthcare', 'Education', 'Finance'];
