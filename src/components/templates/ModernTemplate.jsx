import React from 'react';
import { sanitizeHTML } from '../../utils/sanitize';
import CustomSections from './CustomSections';
import HeaderLinks from './HeaderLinks';
import SkillRatings from './SkillRatings';
import { getResumeLayout, isCustomResumeSection } from '../../utils/resumeSections';
import './TemplateStyles.css';

export default function ModernTemplate({ state, themeColor, fontSize, fontFamily, spacing, layout }) {
  const { contact, workHistory, education, skills, summary, personalDetails, websites, certifications, languages } = state;
  const sectionOrder = (layout || getResumeLayout(state)).sectionOrder;

  const fullName = [contact.firstName, contact.surname].filter(Boolean).join(' ') || 'Your Name';

  const renderSection = (section) => {
    switch (section) {
      case 'summary':
        if (!summary.content) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="summary">
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'none', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>Profile</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(summary.content) }} />
          </div>
        );
      case 'workHistory':
        if (!workHistory.length) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="workHistory">
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'none', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>Experience</h2>
            {workHistory.map(job => (
              <div key={job.id} className="tmpl-item">
                <div className="tmpl-item-header" style={{ fontWeight: 'bold' }}>
                  <span style={{ color: '#1A202C' }}>{job.jobTitle}</span>
                  <span style={{ color: themeColor, fontSize: '0.9em' }}>{job.startDate} - {job.currentJob ? 'Present' : job.endDate}</span>
                </div>
                <div className="tmpl-item-sub" style={{ fontStyle: 'normal', fontWeight: '500' }}>
                  {[job.employer, job.location].filter(Boolean).join(' • ')}
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
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'none', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>Education</h2>
            {education.map(edu => (
              <div key={edu.id} className="tmpl-item">
                <div className="tmpl-item-header">
                  <span style={{ color: '#1A202C', fontWeight: 'bold' }}>{edu.degree || edu.level}</span>
                  <span style={{ color: themeColor, fontSize: '0.9em' }}>{edu.graduationDate}</span>
                </div>
                <div className="tmpl-item-sub" style={{ fontStyle: 'normal' }}>
                  {[edu.schoolName, edu.fieldOfStudy].filter(Boolean).join(' • ')}
                </div>
              </div>
            ))}
          </div>
        );
      case 'skills':
        if (!skills.textContent && !skills.ratings?.some(skill => skill?.name?.trim())) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="skills">
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'none', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>Expertise</h2>
            {skills.ratings?.some(skill => skill?.name?.trim())
              ? <SkillRatings ratings={skills.ratings} showRatings={skills.showRatings !== false} />
              : skills.textContent && <div className="tmpl-content tmpl-skills-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(skills.textContent) }} />}
          </div>
        );
      case 'websites':
        if (!websites.length) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="websites">
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'none', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>Links</h2>
            <ul className="tmpl-list">
              {websites.map(w => <li key={w.id}>{w.url}</li>)}
            </ul>
          </div>
        );
      case 'personalDetails':
        if (!personalDetails.dob && !personalDetails.nationality && !personalDetails.maritalStatus && !personalDetails.gender) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="personalDetails">
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'none', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>Personal</h2>
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
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'none', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>Certifications</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(certifications.content) }} />
          </div>
        );
      case 'languages':
        if (!languages.length) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="languages">
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'none', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>Languages</h2>
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
    <div className="template-modern" style={{ fontFamily, fontSize, color: '#334155' }}>
      <header className="modern-header" style={{ display: 'flex', justifyContent: 'space-between', borderTop: `6px solid ${themeColor}`, padding: 'var(--resume-page-padding, 32px) var(--resume-page-padding, 32px) 16px' }}>
        <div className="modern-header-left" style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '2.5em', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px' }}>{fullName}</h1>
          {workHistory.length > 0 && workHistory[0].jobTitle && (
            <div style={{ color: themeColor, fontSize: '1.2em', fontWeight: 500, marginTop: '4px' }}>
              {workHistory[0].jobTitle}
            </div>
          )}
        </div>
        <div className="modern-header-right" style={{ textAlign: 'right', fontSize: '0.9em', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {contact.email && <span>{contact.email}</span>}
          {contact.phone && <span>{contact.phone}</span>}
          {(contact.city || contact.country) && <span>{[contact.city, contact.country].filter(Boolean).join(', ')}</span>}
          <HeaderLinks contact={contact} websites={websites} />
        </div>
      </header>
      <div className="modern-body" style={{ padding: '0 var(--resume-page-padding, 32px) var(--resume-page-padding, 32px)' }}>
        {sectionOrder.map(renderSection)}
      </div>
    </div>
  );
}
