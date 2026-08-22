import React from 'react';
import { sanitizeHTML } from '../../utils/sanitize';
import { formatResumeDateRange, formatResumeMonth } from '../../utils/resumeDates';
import CustomSections from './CustomSections';
import HeaderLinks from './HeaderLinks';
import SkillRatings from './SkillRatings';
import { getResumeLayout, isCustomResumeSection } from '../../utils/resumeSections';
import './TemplateStyles.css';

export default function CreativeTemplate({ state, themeColor, fontSize, fontFamily, spacing, layout }) {
  const { contact, workHistory, education, skills, summary, personalDetails, websites, certifications, languages } = state;

  const fullName = [contact.firstName, contact.surname].filter(Boolean).join(' ') || 'Your Name';

  // The renderer gets a normalized per-template layout. It never makes its
  // own ordering decision, so moving a section stays consistent in preview,
  // PDF, and DOCX while its content remains unchanged.
  const resolvedLayout = layout || getResumeLayout(state);
  const sidebarSections = resolvedLayout.columns.sidebar;
  const mainSections = resolvedLayout.columns.main;

  const renderSection = (section, isSidebar = false) => {
    const headingColor = isSidebar ? 'rgba(255,255,255,0.9)' : themeColor;
    const borderStyle = isSidebar ? 'rgba(255,255,255,0.2)' : themeColor;
    const sectionClassName = isSidebar ? 'tmpl-section tmpl-sidebar-section' : 'tmpl-section';
    
    switch (section) {
      case 'summary':
        if (!summary.content) return null;
        return (
          <div className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="summary">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Profile</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(summary.content) }} />
          </div>
        );
      case 'workHistory':
        if (!workHistory.length) return null;
        return (
          <div className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="workHistory">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Experience</h2>
            {workHistory.map(job => (
              <div key={job.id} className="tmpl-item">
                {!job._pdfContinuation && (
                  <>
                    <div className="tmpl-item-header">
                      <strong>{job.jobTitle}</strong>
                      <span style={{ color: headingColor, fontWeight: 500 }}>{formatResumeDateRange(job.startDate, job.endDate, job.currentJob)}</span>
                    </div>
                    <div className="tmpl-item-sub">
                      {[job.employer, job.location].filter(Boolean).join(', ')}
                    </div>
                  </>
                )}
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
          <div className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="education">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Education</h2>
            {education.map(edu => (
              <div key={edu.id} className="tmpl-item">
                <div className="tmpl-item-header">
                  <strong>{edu.degree || edu.level}</strong>
                  <span style={{ color: headingColor, fontWeight: 500 }}>{formatResumeMonth(edu.graduationDate)}</span>
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
          <div className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="skills">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Skills</h2>
            {skills.ratings?.some(skill => skill?.name?.trim())
              ? <SkillRatings ratings={skills.ratings} showRatings={skills.showRatings} />
              : skills.textContent && <div className="tmpl-content tmpl-skills-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(skills.textContent) }} />}
          </div>
        );
      case 'websites':
        if (!websites.length) return null;
        return (
          <div className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="websites">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Links</h2>
            <ul className="tmpl-list">
              {websites.map(w => <li key={w.id} style={{ wordBreak: 'break-all' }}>{w.url}</li>)}
            </ul>
          </div>
        );
      case 'personalDetails':
        if (!personalDetails.dob && !personalDetails.nationality && !personalDetails.maritalStatus && !personalDetails.gender) return null;
        return (
          <div className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="personalDetails">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Personal</h2>
            <div className="tmpl-details-grid" style={{ gridTemplateColumns: '1fr' }}>
              {personalDetails.dob && <div><strong>DOB:</strong> <br/>{personalDetails.dob}</div>}
              {personalDetails.nationality && <div><strong>Nationality:</strong> <br/>{personalDetails.nationality}</div>}
              {personalDetails.maritalStatus && <div><strong>Status:</strong> <br/>{personalDetails.maritalStatus}</div>}
              {personalDetails.gender && <div><strong>Gender:</strong> <br/>{personalDetails.gender}</div>}
            </div>
          </div>
        );
      case 'certifications':
        if (!certifications.content) return null;
        return (
          <div className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="certifications">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Certifications</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(certifications.content) }} />
          </div>
        );
      case 'languages':
        if (!languages.length) return null;
        return (
          <div className={sectionClassName} data-resume-section-id={section} style={{ marginBottom: spacing }} key="languages">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Languages</h2>
            <div className="tmpl-details-grid" style={{ gridTemplateColumns: '1fr' }}>
              {languages.map(lang => <div key={lang.id}>{lang.language}</div>)}
            </div>
          </div>
        );
      default:
        return isCustomResumeSection(state, section)
          ? <CustomSections key={section} state={state} themeColor={headingColor} spacing={spacing} sectionIds={[section]} />
          : null;
    }
  };

  return (
    <div className="template-creative" style={{ fontFamily, fontSize, color: '#333', display: 'flex', alignItems: 'stretch' }}>
      <aside className="creative-sidebar" style={{ width: '35%', alignSelf: 'stretch', backgroundColor: themeColor, color: '#fff', padding: 'var(--resume-page-padding, 32px) calc(var(--resume-page-padding, 32px) * 0.75)' }}>
        <h1 style={{ margin: '0 0 16px 0', fontSize: '2.2em', fontWeight: 700, lineHeight: 1.1 }}>{fullName}</h1>
        
        <div className="creative-contact" style={{ marginBottom: '32px', fontSize: '0.9em', opacity: 0.9 }}>
          {contact.email && <div style={{ marginBottom: '8px' }}>{contact.email}</div>}
          {contact.phone && <div style={{ marginBottom: '8px' }}>{contact.phone}</div>}
          {(contact.city || contact.country) && <div>{[contact.city, contact.country].filter(Boolean).join(', ')}</div>}
          <HeaderLinks contact={contact} websites={websites} />
        </div>

        {sidebarSections.map(s => renderSection(s, true))}
      </aside>
      <main className="creative-main" style={{ width: '65%', minWidth: 0, padding: 'var(--resume-page-padding, 32px)' }}>
        {mainSections.map(s => renderSection(s, false))}
      </main>
    </div>
  );
}
