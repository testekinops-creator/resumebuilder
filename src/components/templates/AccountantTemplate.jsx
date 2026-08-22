import React from 'react';
import { sanitizeHTML } from '../../utils/sanitize';
import CustomSections from './CustomSections';
import HeaderLinks from './HeaderLinks';
import SkillRatings from './SkillRatings';
import { getResumeLayout, isCustomResumeSection } from '../../utils/resumeSections';
import './TemplateStyles.css';

function hasPersonalDetails(details) {
  return Boolean(details.dob || details.nationality || details.maritalStatus || details.gender);
}

export default function AccountantTemplate({ state, themeColor, fontSize, fontFamily, spacing, layout }) {
  const {
    contact, workHistory, education, skills, summary, personalDetails,
    websites, certifications, languages,
  } = state;
  const resolvedLayout = layout || getResumeLayout(state);
  const fullName = [contact.firstName, contact.surname].filter(Boolean).join(' ') || 'Your Name';
  const headline = workHistory[0]?.jobTitle || 'Professional Accountant';

  const renderSection = (section, sidebar = false) => {
    const sectionClassName = `tmpl-section${sidebar ? ' accountant-sidebar-section' : ''}`;
    const headingStyle = { color: themeColor };

    switch (section) {
      case 'summary':
        if (!summary.content) return null;
        return (
          <section className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="summary">
            <h2 className="tmpl-heading accountant-heading" style={headingStyle}>About Me</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(summary.content) }} />
          </section>
        );
      case 'workHistory':
        if (!workHistory.length) return null;
        return (
          <section className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="workHistory">
            <h2 className="tmpl-heading accountant-heading" style={headingStyle}>Work Experience</h2>
            {workHistory.map(job => (
              <div key={job.id} className="tmpl-item accountant-entry">
                <div className="accountant-entry-meta">
                  {[job.employer, job.location].filter(Boolean).join(', ')}
                  {([job.employer, job.location].filter(Boolean).length > 0) && (job.startDate || job.endDate || job.currentJob) ? ' | ' : ''}
                  {[job.startDate, job.currentJob ? 'Present' : job.endDate].filter(Boolean).join(' - ')}
                </div>
                <strong className="accountant-entry-title">{job.jobTitle}</strong>
                {job.description && <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(job.description) }} />}
              </div>
            ))}
          </section>
        );
      case 'education':
        if (!education.length) return null;
        return (
          <section className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="education">
            <h2 className="tmpl-heading accountant-heading" style={headingStyle}>Education</h2>
            {education.map(edu => (
              <div key={edu.id} className="tmpl-item accountant-entry">
                <div className="accountant-entry-meta">
                  {[edu.schoolName, edu.location].filter(Boolean).join(', ')}
                  {([edu.schoolName, edu.location].filter(Boolean).length > 0) && edu.graduationDate ? ' | ' : ''}
                  {edu.graduationDate}
                </div>
                <strong className="accountant-entry-title">{[edu.degree || edu.level, edu.fieldOfStudy].filter(Boolean).join(' in ')}</strong>
              </div>
            ))}
          </section>
        );
      case 'skills':
        if (!skills.textContent && !skills.ratings?.some(skill => skill?.name?.trim())) return null;
        return (
          <section className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="skills">
            <h2 className="tmpl-heading accountant-heading" style={headingStyle}>Skills</h2>
            {skills.ratings?.some(skill => skill?.name?.trim())
              ? <SkillRatings ratings={skills.ratings} showRatings={skills.showRatings !== false} />
              : skills.textContent && <div className="tmpl-content accountant-skill-copy" dangerouslySetInnerHTML={{ __html: sanitizeHTML(skills.textContent) }} />}
          </section>
        );
      case 'websites':
        if (!websites.length) return null;
        return (
          <section className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="websites">
            <h2 className="tmpl-heading accountant-heading" style={headingStyle}>Websites & Profiles</h2>
            <ul className="tmpl-list accountant-plain-list">{websites.map(site => <li key={site.id}>{site.url}</li>)}</ul>
          </section>
        );
      case 'personalDetails':
        if (!hasPersonalDetails(personalDetails)) return null;
        return (
          <section className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="personalDetails">
            <h2 className="tmpl-heading accountant-heading" style={headingStyle}>Personal Details</h2>
            <div className="accountant-detail-list">
              {personalDetails.dob && <div><strong>Date of birth</strong>{personalDetails.dob}</div>}
              {personalDetails.nationality && <div><strong>Nationality</strong>{personalDetails.nationality}</div>}
              {personalDetails.maritalStatus && <div><strong>Marital status</strong>{personalDetails.maritalStatus}</div>}
              {personalDetails.gender && <div><strong>Gender</strong>{personalDetails.gender}</div>}
            </div>
          </section>
        );
      case 'certifications':
        if (!certifications.content) return null;
        return (
          <section className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="certifications">
            <h2 className="tmpl-heading accountant-heading" style={headingStyle}>Certifications</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(certifications.content) }} />
          </section>
        );
      case 'languages':
        if (!languages.length) return null;
        return (
          <section className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="languages">
            <h2 className="tmpl-heading accountant-heading" style={headingStyle}>Languages</h2>
            <ul className="tmpl-list accountant-plain-list">{languages.map(language => <li key={language.id}>{language.language}</li>)}</ul>
          </section>
        );
      default:
        return isCustomResumeSection(state, section)
          ? <CustomSections key={section} state={state} themeColor={themeColor} spacing={spacing} sectionIds={[section]} />
          : null;
    }
  };

  const summaryInLeftColumn = resolvedLayout.sections.find(section => section.id === 'summary')?.column === 'sidebar';
  const leftSections = resolvedLayout.columns.sidebar.filter(section => !(section === 'summary' && summaryInLeftColumn));
  const rightSections = resolvedLayout.columns.main;

  return (
    <div className="template-accountant" style={{ fontFamily: fontFamily || 'Arial, sans-serif', fontSize, color: '#333', '--accountant-ink': themeColor }}>
      <header className="accountant-header">
        <h1>{fullName}</h1>
        <p>{headline}</p>
      </header>

      <div className="accountant-summary">{summaryInLeftColumn && renderSection('summary')}</div>

      <div className="accountant-columns">
        <main className="accountant-main">{leftSections.map(section => renderSection(section))}</main>
        <aside className="accountant-sidebar">
          <section className="accountant-contact">
            <h2>Contact</h2>
            {contact.phone && <div>{contact.phone}</div>}
            {contact.email && <div>{contact.email}</div>}
            {(contact.city || contact.country) && <div>{[contact.city, contact.country].filter(Boolean).join(', ')}</div>}
            <HeaderLinks contact={contact} websites={websites} />
          </section>
          {rightSections.map(section => renderSection(section, true))}
        </aside>
      </div>
    </div>
  );
}
