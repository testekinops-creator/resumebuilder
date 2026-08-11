import React from 'react';
import { sanitizeHTML } from '../../utils/sanitize';
import './TemplateStyles.css';

export default function ExecutiveTemplate({ state, themeColor, fontSize, fontFamily, spacing }) {
  const { contact, design, workHistory, education, skills, summary, personalDetails, websites, certifications, languages } = state;
  const sectionOrder = design.sectionOrder || [];

  const fullName = [contact.firstName, contact.surname].filter(Boolean).join(' ') || 'Your Name';

  const renderSection = (section) => {
    switch (section) {
      case 'summary':
        if (!summary.content) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="summary">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>Executive Summary</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(summary.content) }} />
          </div>
        );
      case 'workHistory':
        if (!workHistory.length) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="workHistory">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>Professional Experience</h2>
            {workHistory.map(job => (
              <div key={job.id} className="tmpl-item" style={{ marginBottom: '24px' }}>
                <div className="tmpl-item-header" style={{ fontSize: '1.2em' }}>
                  <strong style={{ color: '#111' }}>{job.jobTitle}</strong>
                </div>
                <div className="tmpl-item-sub" style={{ display: 'flex', justifyContent: 'space-between', color: themeColor, fontWeight: 600, fontStyle: 'normal', marginBottom: '12px' }}>
                  <span>{[job.employer, job.location].filter(Boolean).join(', ')}</span>
                  <span>{job.startDate} - {job.currentJob ? 'Present' : job.endDate}</span>
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
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>Education</h2>
            {education.map(edu => (
              <div key={edu.id} className="tmpl-item">
                <div className="tmpl-item-header">
                  <strong style={{ color: '#111' }}>{edu.degree || edu.level}</strong>
                  <span style={{ color: themeColor, fontWeight: 600 }}>{edu.graduationDate}</span>
                </div>
                <div className="tmpl-item-sub" style={{ fontStyle: 'normal' }}>
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
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>Core Competencies</h2>
            {skills.textContent ? (
              <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(skills.textContent) }} />
            ) : (
              <div className="tmpl-skills-grid">
                {skills.ratings.map(s => <span key={s.id} className="tmpl-skill-pill" style={{ border: `1px solid ${themeColor}`, backgroundColor: 'transparent' }}>{s.name}</span>)}
              </div>
            )}
          </div>
        );
      case 'websites':
        if (!websites.length) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="websites">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>Websites & Portfolios</h2>
            <ul className="tmpl-list">
              {websites.map(w => <li key={w.id}>{w.url}</li>)}
            </ul>
          </div>
        );
      case 'personalDetails':
        if (!personalDetails.dob && !personalDetails.nationality && !personalDetails.maritalStatus && !personalDetails.gender) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="personalDetails">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>Personal Information</h2>
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
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>Certifications</h2>
            <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(certifications.content) }} />
          </div>
        );
      case 'languages':
        if (!languages.length) return null;
        return (
          <div className="tmpl-section" style={{ marginBottom: spacing }} key="languages">
            <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}`, paddingBottom: '4px' }}>Languages</h2>
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
    <div className="template-executive" style={{ fontFamily: fontFamily || 'Georgia, serif', fontSize, color: '#222', border: `8px solid ${themeColor}`, minHeight: '100%', boxSizing: 'border-box' }}>
      <header className="executive-header" style={{ padding: '32px 40px', borderBottom: `2px solid ${themeColor}`, backgroundColor: 'rgba(0,0,0,0.02)' }}>
        <h1 style={{ margin: 0, fontSize: '2.8em', fontWeight: 400, color: '#111' }}>{fullName}</h1>
        <div className="executive-contact" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px', fontSize: '0.9em', color: '#555', fontFamily: 'Arial, sans-serif' }}>
          {contact.email && <span>{contact.email}</span>}
          {contact.phone && <span>{contact.phone}</span>}
          {(contact.city || contact.country) && <span>{[contact.city, contact.country].filter(Boolean).join(', ')}</span>}
        </div>
      </header>
      <div className="executive-body" style={{ padding: '32px 40px' }}>
        {sectionOrder.map(renderSection)}
      </div>
    </div>
  );
}
