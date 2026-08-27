import { sanitizeHTML } from '../../utils/sanitize';
import { formatResumeDateRange, formatResumeMonth } from '../../utils/resumeDates';
import { getResumeLayout, isCustomResumeSection } from '../../utils/resumeSections';
import { getTemplateById } from '../../data/templates';
import HeaderLinks from './HeaderLinks';
import SkillRatings from './SkillRatings';
import './TemplateStyles.css';

const DEFAULT_LABELS = {
  summary: 'Profile',
  workHistory: 'Experience',
  education: 'Education',
  skills: 'Capabilities',
  websites: 'Links',
  personalDetails: 'Details',
  certifications: 'Credentials',
  languages: 'Languages',
};

function nameFor(contact = {}) {
  return [contact.firstName, contact.surname].filter(Boolean).join(' ') || 'Your Name';
}

function headlineFor(state) {
  return state.workHistory?.[0]?.jobTitle || state.education?.[0]?.fieldOfStudy || 'Professional';
}

function hasPersonalDetails(details = {}) {
  return Boolean(details.dob || details.nationality || details.maritalStatus || details.gender);
}

function ResumeSection({ state, sectionId, index, spacing, inSidebar = false, blueprint }) {
  const {
    summary = {}, workHistory = [], education = [], skills = {}, websites = [],
    personalDetails = {}, certifications = {}, languages = [], extraSections = {},
  } = state;
  const customSection = isCustomResumeSection(state, sectionId)
    ? extraSections.custom?.find(section => section.id === sectionId)
    : null;
  const title = state.design?.sectionTitles?.[sectionId]?.trim()
    || customSection?.title
    || DEFAULT_LABELS[sectionId]
    || 'Details';
  const className = [
    'tmpl-section',
    'blueprint-section',
    inSidebar ? 'blueprint-sidebar-section' : '',
    customSection?._pdfContinuation ? 'pdf-section-continuation' : '',
  ].filter(Boolean).join(' ');
  const heading = customSection?._pdfContinuation ? null : (
    <h2 className="tmpl-heading blueprint-heading">
      {['numbered', 'diamond'].includes(blueprint.heading) && (
        <span className="blueprint-heading-mark" aria-hidden="true">
          {blueprint.heading === 'numbered' ? String(index + 1).padStart(2, '0') : '◆'}
        </span>
      )}
      <span>{title}</span>
    </h2>
  );

  const shell = children => (
    <section
      className={className}
      data-resume-section-id={sectionId}
      data-section-index={index + 1}
      style={{ marginBottom: spacing }}
      key={sectionId}
    >
      {heading}
      {children}
    </section>
  );

  switch (sectionId) {
    case 'summary':
      return summary.content ? shell(<div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(summary.content) }} />) : null;
    case 'workHistory':
      return workHistory.length ? shell(workHistory.map(job => (
        <article className="tmpl-item blueprint-entry" key={job.id}>
          {!job._pdfContinuation && (
            <>
              <div className="tmpl-item-header blueprint-entry-header">
                <strong>{job.jobTitle}</strong>
                <span className="blueprint-entry-date">{formatResumeDateRange(job.startDate, job.endDate, job.currentJob)}</span>
              </div>
              <div className="tmpl-item-sub">{[job.employer, job.location].filter(Boolean).join(', ')}</div>
            </>
          )}
          {job.description && <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(job.description) }} />}
        </article>
      ))) : null;
    case 'education':
      return education.length ? shell(education.map(item => (
        <article className="tmpl-item blueprint-entry" key={item.id}>
          <div className="tmpl-item-header blueprint-entry-header">
            <strong>{item.degree || item.level}</strong>
            <span className="blueprint-entry-date">{formatResumeMonth(item.graduationDate)}</span>
          </div>
          <div className="tmpl-item-sub">{[item.schoolName, item.fieldOfStudy, item.location].filter(Boolean).join(', ')}</div>
          {item.coursework && <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(item.coursework) }} />}
        </article>
      ))) : null;
    case 'skills':
      return skills.textContent || skills.ratings?.some(skill => skill?.name?.trim()) ? shell(
        <div className={`blueprint-skills is-${blueprint.skills || 'list'}`}>
          {skills.ratings?.some(skill => skill?.name?.trim())
            ? <SkillRatings ratings={skills.ratings} showRatings={skills.showRatings} />
            : <div className="tmpl-content tmpl-skills-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(skills.textContent) }} />}
        </div>,
      ) : null;
    case 'websites':
      return websites.length ? shell(<ul className="tmpl-list blueprint-link-list">{websites.map(site => <li key={site.id}>{site.url}</li>)}</ul>) : null;
    case 'personalDetails':
      return hasPersonalDetails(personalDetails) ? shell(
        <dl className="blueprint-detail-list">
          {personalDetails.dob && <div><dt>Date of birth</dt><dd>{personalDetails.dob}</dd></div>}
          {personalDetails.nationality && <div><dt>Nationality</dt><dd>{personalDetails.nationality}</dd></div>}
          {personalDetails.maritalStatus && <div><dt>Status</dt><dd>{personalDetails.maritalStatus}</dd></div>}
          {personalDetails.gender && <div><dt>Gender</dt><dd>{personalDetails.gender}</dd></div>}
        </dl>,
      ) : null;
    case 'certifications':
      return certifications.content ? shell(<div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(certifications.content) }} />) : null;
    case 'languages':
      return languages.length ? shell(<ul className="tmpl-list blueprint-language-list">{languages.map(language => <li key={language.id}>{language.language}</li>)}</ul>) : null;
    default:
      return customSection?.content ? shell(<div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(customSection.content) }} />) : null;
  }
}

function Header({ state, blueprint }) {
  const { contact = {}, websites = [] } = state;
  const contactParts = [
    contact.email,
    contact.phone,
    [contact.city, contact.country].filter(Boolean).join(', '),
  ].filter(Boolean);

  return (
    <header className="blueprint-header">
      <div className="blueprint-identity">
        <h1>{nameFor(contact)}</h1>
        <p>{headlineFor(state)}</p>
      </div>
      <div className="blueprint-contact" aria-label="Contact information">
        {contactParts.map(part => <span key={part}>{part}</span>)}
        <HeaderLinks contact={contact} websites={websites} />
      </div>
      {['grid', 'module', 'profile-tile'].includes(blueprint.header) && (
        <span className="blueprint-monogram" aria-hidden="true">{nameFor(contact).charAt(0).toUpperCase()}</span>
      )}
    </header>
  );
}

function SectionList({ state, ids, spacing, inSidebar, blueprint, offset = 0 }) {
  return ids.map((sectionId, index) => (
    <ResumeSection
      key={sectionId}
      state={state}
      sectionId={sectionId}
      index={offset + index}
      spacing={spacing}
      inSidebar={inSidebar}
      blueprint={blueprint}
    />
  ));
}

export default function BlueprintTemplate({ state, fontSize, fontFamily, spacing, layout }) {
  const template = getTemplateById(state.meta?.templateId);
  const blueprint = template.blueprint || {};
  const resolvedLayout = layout || getResumeLayout(state);
  const classNames = [
    'template-blueprint',
    `blueprint-${template.id}`,
    `blueprint-header-${blueprint.header || 'left'}`,
    `blueprint-heading-${blueprint.heading || 'underline'}`,
    `blueprint-entry-${blueprint.entry || 'standard'}`,
    `blueprint-density-${blueprint.density || 'normal'}`,
    resolvedLayout.isTwoColumn ? 'blueprint-two-column' : 'blueprint-single-column',
    blueprint.sidebarPosition === 'right' ? 'blueprint-sidebar-right' : 'blueprint-sidebar-left',
    `blueprint-ratio-${blueprint.ratio || 'balanced'}`,
    `blueprint-sidebar-${blueprint.sidebarStyle || 'plain'}`,
  ].join(' ');
  const body = resolvedLayout.isTwoColumn ? (
    <div className="blueprint-columns">
      {blueprint.sidebarPosition === 'right' ? (
        <>
          <main className="blueprint-main"><SectionList state={state} ids={resolvedLayout.columns.main} spacing={spacing} blueprint={blueprint} /></main>
          <aside className="blueprint-sidebar"><SectionList state={state} ids={resolvedLayout.columns.sidebar} spacing={spacing} inSidebar blueprint={blueprint} offset={resolvedLayout.columns.main.length} /></aside>
        </>
      ) : (
        <>
          <aside className="blueprint-sidebar"><SectionList state={state} ids={resolvedLayout.columns.sidebar} spacing={spacing} inSidebar blueprint={blueprint} /></aside>
          <main className="blueprint-main"><SectionList state={state} ids={resolvedLayout.columns.main} spacing={spacing} blueprint={blueprint} offset={resolvedLayout.columns.sidebar.length} /></main>
        </>
      )}
    </div>
  ) : (
    <main className="blueprint-body"><SectionList state={state} ids={resolvedLayout.sectionOrder} spacing={spacing} blueprint={blueprint} /></main>
  );

  return (
    <article
      className={classNames}
      data-template-signature={template.designSignature}
      style={{ fontFamily, fontSize }}
    >
      <Header state={state} blueprint={blueprint} />
      {body}
    </article>
  );
}
