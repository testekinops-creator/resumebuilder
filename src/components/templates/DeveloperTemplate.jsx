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

export default function DeveloperTemplate({ state, themeColor, fontSize, fontFamily, spacing, layout }) {
  const {
    contact, workHistory, education, skills, summary, personalDetails,
    websites, certifications, languages,
  } = state;
  const resolvedLayout = layout || getResumeLayout(state);
  const fullName = [contact.firstName, contact.surname].filter(Boolean).join(' ') || 'Your Name';
  const headline = workHistory[0]?.jobTitle || 'Developer';

  const renderSection = (section) => {
    const headingStyle = { color: themeColor };
    switch (section) {
      case 'summary':
        if (!summary.content) return null;
        return (
          <section className="tmpl-section developer-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="summary">
            <h2 className="tmpl-heading developer-heading" style={headingStyle}>Summary</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(summary.content) }} />
          </section>
        );
      case 'workHistory':
        if (!workHistory.length) return null;
        return (
          <section className="tmpl-section developer-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="workHistory">
            <h2 className="tmpl-heading developer-heading" style={headingStyle}>Experience</h2>
            {workHistory.map(job => (
              <div key={job.id} className="tmpl-item developer-entry">
                <strong className="developer-entry-title">{job.jobTitle}</strong>
                <div className="developer-employer">{[job.employer, job.location].filter(Boolean).join(', ')}</div>
                <div className="developer-date">{[job.startDate, job.currentJob ? 'Present' : job.endDate].filter(Boolean).join(' - ')}</div>
                {job.description && <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(job.description) }} />}
              </div>
            ))}
          </section>
        );
      case 'education':
        if (!education.length) return null;
        return (
          <section className="tmpl-section developer-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="education">
            <h2 className="tmpl-heading developer-heading" style={headingStyle}>Education</h2>
            {education.map(edu => (
              <div key={edu.id} className="tmpl-item developer-entry">
                <strong className="developer-entry-title">{edu.degree || edu.level}</strong>
                <div className="developer-employer">{[edu.schoolName, edu.fieldOfStudy, edu.location].filter(Boolean).join(', ')}</div>
                {edu.graduationDate && <div className="developer-date">{edu.graduationDate}</div>}
              </div>
            ))}
          </section>
        );
      case 'skills':
        if (!skills.textContent && !skills.ratings?.some(skill => skill?.name?.trim())) return null;
        return (
          <section className="tmpl-section developer-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="skills">
            <h2 className="tmpl-heading developer-heading" style={headingStyle}>Skills</h2>
            {skills.ratings?.some(skill => skill?.name?.trim())
              ? <SkillRatings ratings={skills.ratings} showRatings={skills.showRatings !== false} />
              : skills.textContent && <div className="tmpl-content developer-skill-copy" dangerouslySetInnerHTML={{ __html: sanitizeHTML(skills.textContent) }} />}
          </section>
        );
      case 'websites':
        if (!websites.length) return null;
        return (
          <section className="tmpl-section developer-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="websites">
            <h2 className="tmpl-heading developer-heading" style={headingStyle}>Links</h2>
            <ul className="tmpl-list developer-plain-list">{websites.map(site => <li key={site.id}>{site.url}</li>)}</ul>
          </section>
        );
      case 'personalDetails':
        if (!hasPersonalDetails(personalDetails)) return null;
        return (
          <section className="tmpl-section developer-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="personalDetails">
            <h2 className="tmpl-heading developer-heading" style={headingStyle}>Personal Details</h2>
            <div className="developer-detail-list">
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
          <section className="tmpl-section developer-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="certifications">
            <h2 className="tmpl-heading developer-heading" style={headingStyle}>Certifications</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(certifications.content) }} />
          </section>
        );
      case 'languages':
        if (!languages.length) return null;
        return (
          <section className="tmpl-section developer-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="languages">
            <h2 className="tmpl-heading developer-heading" style={headingStyle}>Languages</h2>
            <ul className="tmpl-list developer-plain-list">{languages.map(language => <li key={language.id}>{language.language}</li>)}</ul>
          </section>
        );
      default:
        return isCustomResumeSection(state, section)
          ? <CustomSections key={section} state={state} themeColor={themeColor} spacing={spacing} sectionIds={[section]} />
          : null;
    }
  };

  const leftSections = resolvedLayout.columns.sidebar;
  const rightSections = resolvedLayout.columns.main;

  return (
    <div className="template-developer" style={{ fontFamily: fontFamily || 'Arial, sans-serif', fontSize, color: '#111', '--developer-accent': themeColor }}>
      <header className="developer-header">
        <h1>{fullName}</h1>
        <p>{headline}</p>
        <div className="developer-contact">
          {contact.phone && <div><span aria-hidden="true">●</span>{contact.phone}</div>}
          {contact.email && <div><span aria-hidden="true">●</span>{contact.email}</div>}
          {(contact.city || contact.country) && <div><span aria-hidden="true">●</span>{[contact.city, contact.country].filter(Boolean).join(', ')}</div>}
          <HeaderLinks contact={contact} websites={websites} />
        </div>
      </header>

      <div className="developer-columns">
        <main className="developer-left">{leftSections.map(renderSection)}</main>
        <aside className="developer-right">{rightSections.map(renderSection)}</aside>
      </div>
    </div>
  );
}
