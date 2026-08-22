import React from 'react';
import { sanitizeHTML } from '../../utils/sanitize';
import { formatResumeDateRange, formatResumeMonth } from '../../utils/resumeDates';
import CustomSections from './CustomSections';
import HeaderLinks from './HeaderLinks';
import SkillRatings from './SkillRatings';
import { getResumeLayout, isCustomResumeSection } from '../../utils/resumeSections';
import './TemplateStyles.css';

export default function MinimalTemplate({ state, themeColor, fontSize, fontFamily, spacing, layout }) {
  const { contact, workHistory, education, skills, summary, personalDetails, websites, certifications, languages } = state;
  const sectionOrder = (layout || getResumeLayout(state)).sectionOrder;

  const fullName = [contact.firstName, contact.surname].filter(Boolean).join(' ') || 'Your Name';

  const renderSection = (section) => {
    switch (section) {
      case 'summary':
        if (!summary.content) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="summary">
            <h2 className="tmpl-heading" style={{ color: themeColor, fontSize: '1.2em', border: 'none', padding: 0 }}>Summary</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(summary.content) }} />
          </div>
        );
      case 'workHistory':
        if (!workHistory.length) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="workHistory">
            <h2 className="tmpl-heading" style={{ color: themeColor, fontSize: '1.2em', border: 'none', padding: 0 }}>Experience</h2>
            {workHistory.map(job => (
              <div key={job.id} className="tmpl-item" style={{ borderLeft: `2px solid ${themeColor}`, paddingLeft: '16px', marginLeft: '4px' }}>
                <div className="tmpl-item-header">
                  <strong>{job.jobTitle}</strong>
                  <span style={{ fontSize: '0.9em', color: '#666' }}>{formatResumeDateRange(job.startDate, job.endDate, job.currentJob)}</span>
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
            <h2 className="tmpl-heading" style={{ color: themeColor, fontSize: '1.2em', border: 'none', padding: 0 }}>Education</h2>
            {education.map(edu => (
              <div key={edu.id} className="tmpl-item" style={{ borderLeft: `2px solid ${themeColor}`, paddingLeft: '16px', marginLeft: '4px' }}>
                <div className="tmpl-item-header">
                  <strong>{edu.degree || edu.level}</strong>
                  <span style={{ fontSize: '0.9em', color: '#666' }}>{formatResumeMonth(edu.graduationDate)}</span>
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
            <h2 className="tmpl-heading" style={{ color: themeColor, fontSize: '1.2em', border: 'none', padding: 0 }}>Skills</h2>
            {skills.ratings?.some(skill => skill?.name?.trim())
              ? <SkillRatings ratings={skills.ratings} showRatings={skills.showRatings} />
              : skills.textContent && <div className="tmpl-content tmpl-skills-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(skills.textContent) }} />}
          </div>
        );
      case 'websites':
        if (!websites.length) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="websites">
            <h2 className="tmpl-heading" style={{ color: themeColor, fontSize: '1.2em', border: 'none', padding: 0 }}>Links</h2>
            <ul className="tmpl-list">
              {websites.map(w => <li key={w.id}>{w.url}</li>)}
            </ul>
          </div>
        );
      case 'personalDetails':
        if (!personalDetails.dob && !personalDetails.nationality && !personalDetails.maritalStatus && !personalDetails.gender) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="personalDetails">
            <h2 className="tmpl-heading" style={{ color: themeColor, fontSize: '1.2em', border: 'none', padding: 0 }}>Personal Details</h2>
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
            <h2 className="tmpl-heading" style={{ color: themeColor, fontSize: '1.2em', border: 'none', padding: 0 }}>Certifications</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(certifications.content) }} />
          </div>
        );
      case 'languages':
        if (!languages.length) return null;
        return (
          <div className="tmpl-section" data-resume-section-id={section} style={{ marginBottom: spacing }} key="languages">
            <h2 className="tmpl-heading" style={{ color: themeColor, fontSize: '1.2em', border: 'none', padding: 0 }}>Languages</h2>
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
    <div className="template-minimal" style={{ fontFamily, fontSize, color: '#333' }}>
      <header className="minimal-header" style={{ padding: '40px var(--resume-page-padding, 32px) 24px' }}>
        <h1 style={{ margin: 0, fontSize: '3em', fontWeight: 300, letterSpacing: '-1px', color: '#111' }}>{fullName}</h1>
        <div className="minimal-contact" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px', fontSize: '0.9em', color: '#666' }}>
          {contact.email && <span>{contact.email}</span>}
          <HeaderLinks contact={contact} websites={websites} />
          {contact.phone && <span>{contact.phone}</span>}
          {(contact.city || contact.country) && <span>{[contact.city, contact.country].filter(Boolean).join(', ')}</span>}
        </div>
      </header>
      <div className="minimal-body" style={{ padding: '0 var(--resume-page-padding, 32px) var(--resume-page-padding, 32px)' }}>
        {sectionOrder.map(renderSection)}
      </div>
    </div>
  );
}
