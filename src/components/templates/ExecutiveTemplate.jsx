import React from 'react';
import { sanitizeHTML } from '../../utils/sanitize';
import { getTemplateSectionTitle } from '../../utils/resumePresentation';
import { formatResumeDateRange, formatResumeMonth } from '../../utils/resumeDates';
import CustomSections from './CustomSections';
import HeaderLinks from './HeaderLinks';
import SkillRatings from './SkillRatings';
import { getResumeLayout, isCustomResumeSection } from '../../utils/resumeSections';
import './TemplateStyles.css';

export default function ExecutiveTemplate({ state, themeColor, fontSize, fontFamily, spacing, layout }) {
  const { contact, workHistory, education, skills, summary, personalDetails, websites, certifications, languages } = state;
  const sectionOrder = (layout || getResumeLayout(state)).sectionOrder;

  const fullName = [contact.firstName, contact.surname].filter(Boolean).join(' ') || 'Your Name';

  const renderSection = (section) => {
    switch (section) {
      case 'summary':
        if (!summary.content) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="summary">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>{getTemplateSectionTitle(state, section)}</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(summary.content) }} />
          </div>
        );
      case 'workHistory':
        if (!workHistory.length) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="workHistory">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>{getTemplateSectionTitle(state, section)}</h2>
            {workHistory.map(job => (
              <div key={job.id} className="tmpl-item" style={{ marginBottom: '24px' }}>
                <div className="tmpl-item-header" style={{ fontSize: '1.2em' }}>
                  <strong style={{ color: '#111' }}>{job.jobTitle}</strong>
                </div>
                <div className="tmpl-item-sub" style={{ display: 'flex', justifyContent: 'space-between', color: themeColor, fontWeight: 600, fontStyle: 'normal', marginBottom: '12px' }}>
                  <span>{[job.employer, job.location].filter(Boolean).join(', ')}</span>
                  <span>{formatResumeDateRange(job.startDate, job.endDate, job.currentJob)}</span>
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
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>{getTemplateSectionTitle(state, section)}</h2>
            {education.map(edu => (
              <div key={edu.id} className="tmpl-item">
                <div className="tmpl-item-header">
                  <strong style={{ color: '#111' }}>{edu.degree || edu.level}</strong>
                  <span style={{ color: themeColor, fontWeight: 600 }}>{formatResumeMonth(edu.graduationDate)}</span>
                </div>
                <div className="tmpl-item-sub" style={{ fontStyle: 'normal' }}>
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
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>{getTemplateSectionTitle(state, section)}</h2>
            {skills.ratings?.some(skill => skill?.name?.trim())
              ? <SkillRatings ratings={skills.ratings} showRatings={skills.showRatings} />
              : skills.textContent && <div className="tmpl-content tmpl-skills-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(skills.textContent) }} />}
          </div>
        );
      case 'websites':
        if (!websites.length) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="websites">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>{getTemplateSectionTitle(state, section)}</h2>
            <ul className="tmpl-list">
              {websites.map(w => <li key={w.id}>{w.url}</li>)}
            </ul>
          </div>
        );
      case 'personalDetails':
        if (!personalDetails.dob && !personalDetails.nationality && !personalDetails.maritalStatus && !personalDetails.gender) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="personalDetails">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>{getTemplateSectionTitle(state, section)}</h2>
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
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>{getTemplateSectionTitle(state, section)}</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(certifications.content) }} />
          </div>
        );
      case 'languages':
        if (!languages.length) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="languages">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>{getTemplateSectionTitle(state, section)}</h2>
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
    <div className="template-executive" style={{ fontFamily: fontFamily || 'Georgia, serif', fontSize, color: '#222', border: `8px solid ${themeColor}`, minHeight: '100%', boxSizing: 'border-box' }}>
      <header className="executive-header" style={{ padding: 'var(--resume-page-padding, 32px) calc(var(--resume-page-padding, 32px) * 1.25)', borderBottom: `2px solid ${themeColor}`, backgroundColor: 'rgba(0,0,0,0.02)' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--presentation-name-size)', fontWeight: 400, color: '#111' }}>{fullName}</h1>
        <div className="executive-contact" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px', fontSize: '0.9em', color: '#555', fontFamily: 'Arial, sans-serif' }}>
          {contact.email && <span>{contact.email}</span>}
          <HeaderLinks contact={contact} websites={websites} />
          {contact.phone && <span>{contact.phone}</span>}
          {(contact.city || contact.country) && <span>{[contact.city, contact.country].filter(Boolean).join(', ')}</span>}
        </div>
      </header>
      <div className="executive-body" style={{ padding: 'var(--resume-page-padding, 32px) calc(var(--resume-page-padding, 32px) * 1.25)' }}>
        {sectionOrder.map(renderSection)}
      </div>
    </div>
  );
}
