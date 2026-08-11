import React from 'react';
import { sanitizeHTML } from '../../utils/sanitize';
import './TemplateStyles.css';

export default function CreativeTemplate({ state, themeColor, fontSize, fontFamily, spacing }) {
  const { contact, design, workHistory, education, skills, summary, personalDetails, websites, certifications, languages } = state;
  const sectionOrder = design.sectionOrder || [];

  const fullName = [contact.firstName, contact.surname].filter(Boolean).join(' ') || 'Your Name';

  // Divide sections for two columns (Sidebar: contact, skills, languages, details, websites) (Main: summary, work, edu, certs)
  const sidebarSections = ['skills', 'languages', 'personalDetails', 'websites'];
  const mainSections = ['summary', 'workHistory', 'education', 'certifications'];

  const renderSection = (section, isSidebar = false) => {
    const headingColor = isSidebar ? 'rgba(255,255,255,0.9)' : themeColor;
    const borderStyle = isSidebar ? 'rgba(255,255,255,0.2)' : themeColor;
    
    switch (section) {
      case 'summary':
        if (!summary.content) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="summary">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Profile</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(summary.content) }} />
          </div>
        );
      case 'workHistory':
        if (!workHistory.length) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="workHistory">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Experience</h2>
            {workHistory.map(job => (
              <div key={job.id} className="tmpl-item">
                <div className="tmpl-item-header">
                  <strong>{job.jobTitle}</strong>
                  <span style={{ color: themeColor, fontWeight: 500 }}>{job.startDate} - {job.currentJob ? 'Present' : job.endDate}</span>
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
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="education">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Education</h2>
            {education.map(edu => (
              <div key={edu.id} className="tmpl-item">
                <div className="tmpl-item-header">
                  <strong>{edu.degree || edu.level}</strong>
                  <span style={{ color: themeColor, fontWeight: 500 }}>{edu.graduationDate}</span>
                </div>
                <div className="tmpl-item-sub">
                  {[edu.schoolName, edu.fieldOfStudy].filter(Boolean).join(', ')}
                </div>
              </div>
            ))}
          </div>
        );
      case 'skills':
        if (!skills.textContent && !skills.ratings.length) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="skills">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Skills</h2>
            {skills.textContent ? (
              <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(skills.textContent) }} />
            ) : (
              <div className="tmpl-skills-grid" style={{ flexDirection: 'column' }}>
                {skills.ratings.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'websites':
        if (!websites.length) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="websites">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Links</h2>
            <ul className="tmpl-list" style={{ paddingLeft: '16px' }}>
              {websites.map(w => <li key={w.id} style={{ wordBreak: 'break-all' }}>{w.url}</li>)}
            </ul>
          </div>
        );
      case 'personalDetails':
        if (!personalDetails.dob && !personalDetails.nationality && !personalDetails.maritalStatus && !personalDetails.gender) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="personalDetails">
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
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="certifications">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Certifications</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(certifications.content) }} />
          </div>
        );
      case 'languages':
        if (!languages.length) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="languages">
            <h2 className="tmpl-heading" style={{ color: headingColor, borderBottom: `2px solid ${borderStyle}` }}>Languages</h2>
            <div className="tmpl-details-grid" style={{ gridTemplateColumns: '1fr' }}>
              {languages.map(lang => (
                <div key={lang.id}><strong>{lang.language}:</strong> <br/>{lang.level}</div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="template-creative" style={{ fontFamily, fontSize, color: '#333', display: 'flex', minHeight: '100%' }}>
      <aside className="creative-sidebar" style={{ width: '35%', backgroundColor: themeColor, color: '#fff', padding: '32px 24px' }}>
        <h1 style={{ margin: '0 0 16px 0', fontSize: '2.2em', fontWeight: 700, lineHeight: 1.1 }}>{fullName}</h1>
        
        <div className="creative-contact" style={{ marginBottom: '32px', fontSize: '0.9em', opacity: 0.9 }}>
          {contact.email && <div style={{ marginBottom: '8px' }}>{contact.email}</div>}
          {contact.phone && <div style={{ marginBottom: '8px' }}>{contact.phone}</div>}
          {(contact.city || contact.country) && <div>{[contact.city, contact.country].filter(Boolean).join(', ')}</div>}
        </div>

        {sidebarSections.map(s => renderSection(s, true))}
      </aside>
      <main className="creative-main" style={{ width: '65%', padding: '32px' }}>
        {mainSections.map(s => renderSection(s, false))}
      </main>
    </div>
  );
}
