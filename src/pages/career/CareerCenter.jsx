import { useState } from 'react';
import Navbar from '../../components/Navbar';
import './CareerCenter.css';

const ARTICLES = [
  {
    id: 'resume-format',
    category: 'Resume Tips',
    icon: '📄',
    title: 'How to Choose the Right Resume Format in 2026',
    readTime: '5 min',
    content: `
## Chronological, Functional, or Combination?

Choosing the right resume format is the first critical decision in your job search. Here's a breakdown:

### Chronological (Most Common)
**Best for:** Professionals with steady career progression.
- Lists work experience from most recent to oldest
- Hiring managers prefer this format — 90% of recruiters scan experience first
- Use when: You have a clear career path with no major gaps

### Functional (Skills-Based)
**Best for:** Career changers or those with employment gaps.
- Highlights skills and accomplishments over timeline
- Groups achievements by skill category
- Use when: Your skills are more impressive than your job titles

### Combination (Hybrid)
**Best for:** Mid-career professionals with diverse skills.
- Blends skills section with chronological work history
- Provides the most flexibility
- Use when: You want to showcase both skills AND progression

### Pro Tip
Most ATS (Applicant Tracking Systems) parse chronological formats best. When in doubt, go chronological.
    `,
  },
  {
    id: 'ats-keywords',
    category: 'ATS',
    icon: '🤖',
    title: 'Beat the ATS: Keyword Optimization Guide',
    readTime: '7 min',
    content: `
## What is an ATS?

An Applicant Tracking System (ATS) is software used by 98% of Fortune 500 companies to filter resumes before a human ever sees them. If your resume isn't ATS-optimized, it may never reach a recruiter.

### How ATS Screening Works
1. The system scans your resume for **keywords** from the job description
2. It assigns a **match score** based on keyword density and relevance
3. Only resumes above a threshold score are forwarded to recruiters

### Keyword Optimization Strategy

**Step 1: Analyze the Job Description**
- Copy the job posting into a word frequency tool
- Identify the top 10-15 repeated terms (skills, tools, certifications)

**Step 2: Mirror the Language**
- Use the EXACT phrasing from the job description
- If they say "project management," don't write "managing projects"
- Include both acronyms and full terms: "Search Engine Optimization (SEO)"

**Step 3: Place Keywords Strategically**
- **Summary section:** Top 3-5 critical keywords
- **Skills section:** Technical and soft skills from the posting
- **Work experience:** Naturally weave keywords into bullet points

### Common ATS Mistakes
- ❌ Using tables, columns, or text boxes
- ❌ Submitting as image-based PDFs
- ❌ Using creative headers like "Where I've Made an Impact" instead of "Work Experience"
- ✅ Use standard section headings: Summary, Experience, Education, Skills
    `,
  },
  {
    id: 'cover-letter-tips',
    category: 'Cover Letters',
    icon: '✉️',
    title: '5 Cover Letter Mistakes That Cost You Interviews',
    readTime: '4 min',
    content: `
## Common Cover Letter Mistakes

### 1. Starting with "To Whom It May Concern"
**Instead:** Research the hiring manager's name on LinkedIn. "Dear [Name]" shows initiative.

### 2. Repeating Your Resume
**Instead:** Tell a story that your resume can't. Explain WHY you're passionate about this role, not just WHAT you did.

### 3. Making It About You
**Instead:** Focus on what you bring to the company. Replace "I want to grow my career" with "I'm excited to help [Company] achieve [specific goal]."

### 4. Being Too Long
**Instead:** Keep it to 3-4 paragraphs, max 400 words. Recruiters spend 6 seconds on a cover letter.

### 5. Using a Generic Template
**Instead:** Customize each letter. Mention the company name, recent news, or specific products that excite you.

### The Perfect Structure
1. **Opening:** Hook with why this role excites you (2-3 sentences)
2. **Body:** Your strongest achievement relevant to this job (3-4 sentences)
3. **Bridge:** Why THIS company specifically (2-3 sentences)
4. **Close:** Call to action (1-2 sentences)
    `,
  },
  {
    id: 'interview-prep',
    category: 'Interviews',
    icon: '🎯',
    title: 'The STAR Method: Answer Any Interview Question',
    readTime: '6 min',
    content: `
## Master Behavioral Interviews with STAR

Most modern interviews use behavioral questions: "Tell me about a time when..." The STAR method gives you a framework to answer them confidently.

### S — Situation
Set the scene. Briefly describe the context.
> "At my previous company, our main product had a 40% customer churn rate..."

### T — Task
Explain your responsibility.
> "As the lead developer, I was tasked with identifying the root cause and reducing churn..."

### A — Action
Detail the specific steps YOU took.
> "I analyzed user session data, identified 3 key friction points, redesigned the onboarding flow, and A/B tested improvements..."

### R — Result
Quantify the outcome.
> "Within 3 months, churn dropped from 40% to 18%, saving $2.4M annually."

### Practice Questions
- "Tell me about a time you dealt with a difficult coworker."
- "Describe a situation where you had to meet a tight deadline."
- "Give an example of when you showed leadership."
- "Tell me about a time you failed and what you learned."

### Pro Tips
- **Prepare 5-8 STAR stories** that cover: leadership, conflict, failure, teamwork, initiative
- **Keep each answer under 2 minutes**
- **Always quantify results** with numbers, percentages, or dollar amounts
    `,
  },
  {
    id: 'salary-negotiation',
    category: 'Career Growth',
    icon: '💰',
    title: 'Salary Negotiation: How to Get Paid What You Deserve',
    readTime: '5 min',
    content: `
## The Art of Salary Negotiation

Research shows that 57% of people never negotiate their salary. Those who do earn an average of $5,000 more per year.

### Before the Negotiation

**Research Market Rates**
- Use Glassdoor, Levels.fyi, PayScale to find your market value
- Factor in: location, experience, industry, company size
- Know your range: minimum, target, and dream numbers

**Document Your Value**
- List your top 5 achievements with quantified results
- Gather any performance review highlights
- Note any special skills or certifications

### During the Negotiation

**Rule 1: Let them name a number first**
> "I'd love to learn more about the total compensation package before discussing numbers."

**Rule 2: Counter with confidence**
> "Based on my research and the value I bring, I was hoping for something in the range of $X-$Y."

**Rule 3: Negotiate beyond salary**
If salary is firm, negotiate:
- Signing bonus
- Extra PTO days
- Remote work flexibility
- Professional development budget
- Title upgrade

### The Script
> "Thank you for the offer of $X. I'm very excited about this role. Based on my research of market rates for similar positions and my [specific value-add], I was hoping we could discuss a salary closer to $Y. Is there flexibility there?"
    `,
  },
  {
    id: 'linkedin-profile',
    category: 'Personal Branding',
    icon: '🔗',
    title: 'Optimize Your LinkedIn Profile for Recruiters',
    readTime: '5 min',
    content: `
## LinkedIn Profile Optimization

93% of recruiters use LinkedIn to find candidates. Here's how to make your profile stand out.

### Profile Photo
- Professional headshot with a clean background
- Smile — profiles with smiles get 14x more views
- Avoid group photos, selfies, or vacation shots

### Headline (Most Important)
Don't just use your job title. Instead, show your value:
- ❌ "Software Engineer at TechCorp"
- ✅ "Full-Stack Engineer | Building scalable SaaS products | React, Node.js, AWS"

### About Section
- Write in first person
- Open with a hook: your mission or what drives you
- Include 3-5 key achievements with numbers
- End with what you're looking for

### Experience Section
- Mirror your resume bullet points
- Add media: presentations, projects, publications
- Request recommendations from colleagues

### Skills & Endorsements
- Add 50 skills (LinkedIn allows this)
- Pin your top 3 most relevant skills
- Endorse others — they'll often endorse you back

### Activity
- Post 1-2 times per week about your industry
- Comment on posts from target companies
- Share articles with your own insights added
    `,
  },
];

const CATEGORIES = ['All', 'Resume Tips', 'ATS', 'Cover Letters', 'Interviews', 'Career Growth', 'Personal Branding'];

export default function CareerCenter() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const filtered = activeCategory === 'All'
    ? ARTICLES
    : ARTICLES.filter(a => a.category === activeCategory);

  return (
    <div className="career-page">
      <Navbar />

      <div className="career-hero">
        <h1>Career Center</h1>
        <p>Expert tips and guides to help you land your dream job.</p>
      </div>

      <div className="career-container">
        {/* Category Filter */}
        <div className="career-filters">
          {CATEGORIES.map(cat => (
            <button key={cat}
              className={`career-filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => { setActiveCategory(cat); setSelectedArticle(null); }}>
              {cat}
            </button>
          ))}
        </div>

        {selectedArticle ? (
          /* Article Reader */
          <div className="career-reader">
            <button className="career-back-btn" onClick={() => setSelectedArticle(null)}>
              ← Back to Articles
            </button>
            <article className="career-article">
              <div className="career-article-header">
                <span className="career-article-icon">{selectedArticle.icon}</span>
                <div>
                  <span className="career-article-cat">{selectedArticle.category}</span>
                  <h2>{selectedArticle.title}</h2>
                  <span className="career-article-meta">📖 {selectedArticle.readTime} read</span>
                </div>
              </div>
              <div className="career-article-body" dangerouslySetInnerHTML={{
                __html: selectedArticle.content
                  .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                  .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                  .replace(/^\*\*(.+?)\*\*/gm, '<strong>$1</strong>')
                  .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
                  .replace(/^- (.+)$/gm, '<li>$1</li>')
                  .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
                  .replace(/\n\n/g, '</p><p>')
                  .replace(/^(?!<[hublq])(.+)$/gm, '<p>$1</p>')
              }} />
            </article>
          </div>
        ) : (
          /* Article Grid */
          <div className="career-grid">
            {filtered.map(article => (
              <div key={article.id} className="career-card" onClick={() => setSelectedArticle(article)}>
                <div className="career-card-icon">{article.icon}</div>
                <span className="career-card-cat">{article.category}</span>
                <h3 className="career-card-title">{article.title}</h3>
                <span className="career-card-meta">📖 {article.readTime} read</span>
                <span className="career-card-cta">Read Article →</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
