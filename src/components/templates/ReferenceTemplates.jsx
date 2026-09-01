import React from 'react';
import { sanitizeHTML } from '../../utils/sanitize';
import { formatResumeDateRange, formatResumeMonth } from '../../utils/resumeDates';
import CustomSections from './CustomSections';
import HeaderLinks from './HeaderLinks';
import SkillRatings from './SkillRatings';
import { getResumeLayout, isCustomResumeSection } from '../../utils/resumeSections';
import { getTemplateSectionTitle } from '../../utils/resumePresentation';
import './TemplateStyles.css';

function fullName(contact = {}) {
  return [contact.firstName, contact.surname].filter(Boolean).join(' ') || 'Your Name';
}

function headline(workHistory = [], fallback = 'Professional') {
  return workHistory[0]?.jobTitle || fallback;
}

function hasPersonalDetails(details = {}) {
  return Boolean(details.dob || details.nationality || details.maritalStatus || details.gender);
}

function TemplateSection({ state, section, themeColor, spacing, variant, sidebar = false }) {
  const {
    workHistory = [], education = [], skills = {}, summary = {}, personalDetails = {},
    websites = [], certifications = {}, languages = [],
  } = state;
  const label = getTemplateSectionTitle(state, section);
  const classes = `tmpl-section ${variant}-section${sidebar ? ` ${variant}-sidebar-section` : ''}`;
  const title = <h2 className="tmpl-heading">{label}</h2>;

  switch (section) {
    case 'summary':
      return summary.content ? (
        <section className={classes} data-resume-section-id={section} style={{ marginBottom: spacing }} key={section}>
          {title}
          <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(summary.content) }} />
        </section>
      ) : null;
    case 'workHistory':
      return workHistory.length ? (
        <section className={classes} data-resume-section-id={section} style={{ marginBottom: spacing }} key={section}>
          {title}
          {workHistory.map(job => (
            <article className={`tmpl-item ${variant}-entry`} key={job.id}>
              <div className="tmpl-item-header">
                <strong>{job.jobTitle}</strong>
                <span>{formatResumeDateRange(job.startDate, job.endDate, job.currentJob)}</span>
              </div>
              <div className="tmpl-item-sub">{[job.employer, job.location].filter(Boolean).join(', ')}</div>
              {job.description && <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(job.description) }} />}
            </article>
          ))}
        </section>
      ) : null;
    case 'education':
      return education.length ? (
        <section className={classes} data-resume-section-id={section} style={{ marginBottom: spacing }} key={section}>
          {title}
          {education.map(item => (
            <article className={`tmpl-item ${variant}-entry`} key={item.id}>
              <div className="tmpl-item-header">
                <strong>{item.degree || item.level}</strong>
                <span>{formatResumeMonth(item.graduationDate)}</span>
              </div>
              <div className="tmpl-item-sub">{[item.schoolName, item.fieldOfStudy, item.location].filter(Boolean).join(', ')}</div>
            </article>
          ))}
        </section>
      ) : null;
    case 'skills':
      return skills.textContent || skills.ratings?.some(skill => skill?.name?.trim()) ? (
        <section className={classes} data-resume-section-id={section} style={{ marginBottom: spacing }} key={section}>
          {title}
          {skills.ratings?.some(skill => skill?.name?.trim())
            ? <SkillRatings ratings={skills.ratings} showRatings={skills.showRatings} />
            : skills.textContent && <div className="tmpl-content tmpl-skills-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(skills.textContent) }} />}
        </section>
      ) : null;
    case 'websites':
      return websites.length ? (
        <section className={classes} data-resume-section-id={section} style={{ marginBottom: spacing }} key={section}>
          {title}<ul className="tmpl-list">{websites.map(site => <li key={site.id}>{site.url}</li>)}</ul>
        </section>
      ) : null;
    case 'personalDetails':
      return hasPersonalDetails(personalDetails) ? (
        <section className={classes} data-resume-section-id={section} style={{ marginBottom: spacing }} key={section}>
          {title}
          <div className="tmpl-details-grid">
            {personalDetails.dob && <div><strong>Date of birth:</strong> {personalDetails.dob}</div>}
            {personalDetails.nationality && <div><strong>Nationality:</strong> {personalDetails.nationality}</div>}
            {personalDetails.maritalStatus && <div><strong>Status:</strong> {personalDetails.maritalStatus}</div>}
            {personalDetails.gender && <div><strong>Gender:</strong> {personalDetails.gender}</div>}
          </div>
        </section>
      ) : null;
    case 'certifications':
      return certifications.content ? (
        <section className={classes} data-resume-section-id={section} style={{ marginBottom: spacing }} key={section}>
          {title}<div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(certifications.content) }} />
        </section>
      ) : null;
    case 'languages':
      return languages.length ? (
        <section className={classes} data-resume-section-id={section} style={{ marginBottom: spacing }} key={section}>
          {title}<ul className="tmpl-list">{languages.map(language => <li key={language.id}>{language.language}</li>)}</ul>
        </section>
      ) : null;
    default:
      return isCustomResumeSection(state, section)
        ? <CustomSections key={section} state={state} themeColor={themeColor} spacing={spacing} sectionIds={[section]} />
        : null;
  }
}

export function TimelineTemplate({ state, themeColor, fontSize, fontFamily, spacing, layout }) {
  const resolvedLayout = layout || getResumeLayout(state);
  const { contact = {}, workHistory = [], websites = [] } = state;
  const sidebarSections = resolvedLayout.columns.sidebar;
  const mainSections = resolvedLayout.columns.main;

  return (
    <div className="template-timeline" style={{ fontFamily, fontSize, '--timeline-accent': themeColor }}>
      <header className="timeline-header">
        <h1>{fullName(contact)}</h1>
        <p>{headline(workHistory, 'Professional')}</p>
      </header>
      <div className="timeline-header-rule" />
      <div className="timeline-layout">
        <aside className="timeline-sidebar">
          <section className="timeline-contact">
            <h2>Contact</h2>
            {contact.phone && <div>{contact.phone}</div>}
            {contact.email && <div>{contact.email}</div>}
            {(contact.city || contact.country) && <div>{[contact.city, contact.country].filter(Boolean).join(', ')}</div>}
            <HeaderLinks contact={contact} websites={websites} />
          </section>
          {sidebarSections.map(section => <TemplateSection key={section} state={state} section={section} themeColor={themeColor} spacing={spacing} variant="timeline" sidebar />)}
        </aside>
        <div className="timeline-rail" aria-hidden="true"><span /><span /><span /><span /></div>
        <main className="timeline-main">
          {mainSections.map(section => <TemplateSection key={section} state={state} section={section} themeColor={themeColor} spacing={spacing} variant="timeline" />)}
        </main>
      </div>
    </div>
  );
}

export function EditorialTemplate({ state, themeColor, fontSize, fontFamily, spacing, layout }) {
  const resolvedLayout = layout || getResumeLayout(state);
  const { contact = {}, workHistory = [], websites = [] } = state;

  return (
    <div className="template-editorial" style={{ fontFamily, fontSize, '--editorial-accent': themeColor }}>
      <header className="editorial-header">
        <h1>{fullName(contact)}</h1>
        <p>{headline(workHistory, 'Professional')}</p>
      </header>
      <div className="editorial-contact-band">
        {[contact.phone, contact.email, [contact.city, contact.country].filter(Boolean).join(', ')].filter(Boolean).map(value => <span key={value}>{value}</span>)}
        <HeaderLinks contact={contact} websites={websites} />
      </div>
      <main className="editorial-body">
        {resolvedLayout.sectionOrder.map(section => <TemplateSection key={section} state={state} section={section} themeColor={themeColor} spacing={spacing} variant="editorial" />)}
      </main>
    </div>
  );
}

export function AtsSerifTemplate({ state, themeColor, fontSize, fontFamily, spacing, layout }) {
  const resolvedLayout = layout || getResumeLayout(state);
  const { contact = {}, workHistory = [], websites = [] } = state;
  const atsFontFamily = /^inter(?:\s*,|$)/i.test(String(fontFamily || ''))
    ? "Georgia, 'Times New Roman', serif"
    : fontFamily;

  return (
    <div className="template-ats-serif" style={{ fontFamily: atsFontFamily || 'Georgia, serif', fontSize, '--ats-accent': themeColor }}>
      <header className="ats-serif-header">
        <div><h1>{fullName(contact)}</h1><p>{headline(workHistory, 'Professional')}</p></div>
        <div className="ats-serif-contact">
          {contact.email && <div>{contact.email}</div>}
          {contact.phone && <div>{contact.phone}</div>}
          {(contact.city || contact.country) && <div>{[contact.city, contact.country].filter(Boolean).join(', ')}</div>}
          <HeaderLinks contact={contact} websites={websites} />
        </div>
      </header>
      <main className="ats-serif-body">
        {resolvedLayout.sectionOrder.map(section => <TemplateSection key={section} state={state} section={section} themeColor={themeColor} spacing={spacing} variant="ats-serif" />)}
      </main>
    </div>
  );
}
