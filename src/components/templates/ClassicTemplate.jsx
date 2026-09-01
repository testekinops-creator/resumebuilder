import React from 'react';
import { sanitizeHTML } from '../../utils/sanitize';
import { getTemplateSectionTitle } from '../../utils/resumePresentation';
import { formatResumeDateRange, formatResumeMonth } from '../../utils/resumeDates';
import CustomSections from './CustomSections';
import HeaderLinks from './HeaderLinks';
import SkillRatings from './SkillRatings';
import { getResumeLayout, isCustomResumeSection } from '../../utils/resumeSections';
import './TemplateStyles.css';

export default function ClassicTemplate({ state, themeColor, fontSize, fontFamily, spacing, layout }) {
  const { contact, workHistory, education, skills, summary, personalDetails, websites, certifications, languages } = state;
  const sectionOrder = (layout || getResumeLayout(state)).sectionOrder;

  const fullName = [contact.firstName, contact.surname].filter(Boolean).join(' ') || 'Your Name';

  const renderSection = (section) => {
    switch (section) {
      case 'summary':
        if (!summary.content) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="summary">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}` }}>{getTemplateSectionTitle(state, section)}</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(summary.content) }} />
          </div>
        );
      case 'workHistory':
        if (!workHistory.length) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="workHistory">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}` }}>{getTemplateSectionTitle(state, section)}</h2>
            {workHistory.map(job => (
              <div key={job.id} className="tmpl-item">
                <div className="tmpl-item-header">
                  <strong>{job.jobTitle}</strong>
                  <span>{formatResumeDateRange(job.startDate, job.endDate, job.currentJob)}</span>
                </div>
                <div className="tmpl-item-sub">
                  {[job.employer, job.location].filter(Boolean).join(', ')}
                </div>
                {job.description && (
                  <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(job.description) }} />
                )}
              </div>
            ))}
          </div>
        );
      case 'education':
        if (!education.length) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="education">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}` }}>{getTemplateSectionTitle(state, section)}</h2>
            {education.map(edu => (
              <div key={edu.id} className="tmpl-item">
                <div className="tmpl-item-header">
                  <strong>{edu.degree || edu.level}</strong>
                  <span>{formatResumeMonth(edu.graduationDate)}</span>
                </div>
                <div className="tmpl-item-sub">
                  {[edu.schoolName, edu.fieldOfStudy].filter(Boolean).join(', ')}
                </div>
              </div>
            ))}
          </div>
        );
      case 'skills':
        if (!skills.textContent && !skills.ratings?.some(skill => skill?.name?.trim())) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="skills">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}` }}>{getTemplateSectionTitle(state, section)}</h2>
            {skills.ratings?.some(skill => skill?.name?.trim())
              ? <SkillRatings ratings={skills.ratings} showRatings={skills.showRatings} />
              : skills.textContent && <div className="tmpl-content tmpl-skills-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(skills.textContent) }} />}
          </div>
        );
      case 'websites':
        if (!websites.length) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="websites">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}` }}>{getTemplateSectionTitle(state, section)}</h2>
            <ul className="tmpl-list">
              {websites.map(w => <li key={w.id}>{w.url}</li>)}
            </ul>
          </div>
        );
      case 'personalDetails':
        if (!personalDetails.dob && !personalDetails.nationality && !personalDetails.maritalStatus && !personalDetails.gender) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="personalDetails">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}` }}>{getTemplateSectionTitle(state, section)}</h2>
            <div className="tmpl-details-grid">
              {personalDetails.dob && <div><strong>DOB:</strong> {personalDetails.dob}</div>}
              {personalDetails.nationality && <div><strong>Nationality:</strong> {personalDetails.nationality}</div>}
              {personalDetails.maritalStatus && <div><strong>Status:</strong> {personalDetails.maritalStatus}</div>}
              {personalDetails.gender && <div><strong>Gender:</strong> {personalDetails.gender}</div>}
            </div>
          </div>
        );
      case 'certifications':
        if (!certifications.content) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="certifications">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}` }}>{getTemplateSectionTitle(state, section)}</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(certifications.content) }} />
          </div>
        );
      case 'languages':
        if (!languages.length) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="languages">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}` }}>{getTemplateSectionTitle(state, section)}</h2>
            <div className="tmpl-details-grid">
              {languages.map(lang => <div key={lang.id}>{lang.language}</div>)}
            </div>
          </div>
        );
      default:
        return isCustomResumeSection(state, section)
          ? <CustomSections key={section} state={state} themeColor={themeColor} spacing={spacing} sectionIds={[section]} />
          : null;
    }
  };

  return (
    <div className="template-classic" style={{ fontFamily, fontSize, color: '#333' }}>
      <header className="classic-header" style={{ backgroundColor: themeColor, color: '#fff', padding: '24px 32px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--presentation-name-size)', fontWeight: 600, letterSpacing: '1px' }}>{fullName}</h1>
        <div className="classic-contact" style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '12px', fontSize: '0.9em', opacity: 0.9 }}>
          {contact.email && <span>{contact.email}</span>}
          {contact.phone && <span>{contact.phone}</span>}
          {(contact.city || contact.country) && <span>{[contact.city, contact.country].filter(Boolean).join(', ')}</span>}
          <HeaderLinks contact={contact} websites={websites} />
        </div>
      </header>
      <div className="classic-body" style={{ padding: 'var(--resume-page-padding, 32px)' }}>
        {sectionOrder.map(renderSection)}
      </div>
    </div>
  );
}
