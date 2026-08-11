import React from 'react';
import { sanitizeHTML } from '../../utils/sanitize';
import './TemplateStyles.css';

export default function ProfessionalTemplate({ state, themeColor, fontSize, fontFamily, spacing }) {
  const { contact, design, workHistory, education, skills, summary, personalDetails, websites, certifications, languages } = state;
  const sectionOrder = design.sectionOrder || [];

  const fullName = [contact.firstName, contact.surname].filter(Boolean).join(' ') || 'Your Name';

  const renderSection = (section) => {
    switch (section) {
      case 'summary':
        if (!summary.content) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="summary">
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'uppercase', borderBottom: `2px solid #333`, paddingBottom: '4px' }}>Professional Summary</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(summary.content) }} />
          </div>
        );
      case 'workHistory':
        if (!workHistory.length) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="workHistory">
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'uppercase', borderBottom: `2px solid #333`, paddingBottom: '4px' }}>Work Experience</h2>
            {workHistory.map(job => (
              <div key={job.id} className="tmpl-item">
                <div className="tmpl-item-header">
                  <strong>{job.jobTitle}</strong>
                  <span>{job.startDate} - {job.currentJob ? 'Present' : job.endDate}</span>
                </div>
                <div className="tmpl-item-sub" style={{ fontStyle: 'italic', color: '#000' }}>
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
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'uppercase', borderBottom: `2px solid #333`, paddingBottom: '4px' }}>Education</h2>
            {education.map(edu => (
              <div key={edu.id} className="tmpl-item">
                <div className="tmpl-item-header">
                  <strong>{edu.schoolName}</strong>
                  <span>{edu.graduationDate}</span>
                </div>
                <div className="tmpl-item-sub">
                  {[edu.degree || edu.level, edu.fieldOfStudy].filter(Boolean).join(' in ')} {edu.location ? `- ${edu.location}` : ''}
                </div>
              </div>
            ))}
          </div>
        );
      case 'skills':
        if (!skills.textContent && !skills.ratings.length) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="skills">
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'uppercase', borderBottom: `2px solid #333`, paddingBottom: '4px' }}>Skills & Core Competencies</h2>
            {skills.textContent ? (
              <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(skills.textContent) }} />
            ) : (
              <div className="tmpl-skills-grid">
                {skills.ratings.map(s => <span key={s.id} className="tmpl-skill-pill" style={{ background: 'none', padding: 0, fontWeight: '500' }}>{s.name} &nbsp;•&nbsp; </span>)}
              </div>
            )}
          </div>
        );
      case 'websites':
        if (!websites.length) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="websites">
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'uppercase', borderBottom: `2px solid #333`, paddingBottom: '4px' }}>Links & Publications</h2>
            <ul className="tmpl-list">
              {websites.map(w => <li key={w.id}>{w.url}</li>)}
            </ul>
          </div>
        );
      case 'personalDetails':
        if (!personalDetails.dob && !personalDetails.nationality && !personalDetails.maritalStatus && !personalDetails.gender) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="personalDetails">
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'uppercase', borderBottom: `2px solid #333`, paddingBottom: '4px' }}>Personal Details</h2>
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
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="certifications">
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'uppercase', borderBottom: `2px solid #333`, paddingBottom: '4px' }}>Certifications</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(certifications.content) }} />
          </div>
        );
      case 'languages':
        if (!languages.length) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="languages">
            <h2 className="tmpl-heading" style={{ color: themeColor, textTransform: 'uppercase', borderBottom: `2px solid #333`, paddingBottom: '4px' }}>Languages</h2>
            <div className="tmpl-details-grid">
              {languages.map(lang => (
                <div key={lang.id}><strong>{lang.language}:</strong> {lang.level}</div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="template-professional" style={{ fontFamily: fontFamily || 'Times New Roman, serif', fontSize, color: '#111' }}>
      <header className="professional-header" style={{ padding: '32px 32px 16px 32px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '2.5em', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '2px', color: themeColor }}>{fullName}</h1>
        <div className="professional-contact" style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '12px', fontSize: '0.9em' }}>
          {contact.city && <span>{contact.city}{contact.country ? `, ${contact.country}` : ''}</span>}
          {(contact.city || contact.country) && contact.phone && <span>|</span>}
          {contact.phone && <span>{contact.phone}</span>}
          {(contact.phone || contact.city) && contact.email && <span>|</span>}
          {contact.email && <span>{contact.email}</span>}
        </div>
      </header>
      <div className="professional-body" style={{ padding: '0 32px 32px 32px' }}>
        {sectionOrder.map(renderSection)}
      </div>
    </div>
  );
}
