function textContent(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(value) {
  const text = textContent(value);
  return text ? text.split(/\s+/) : [];
}

function hasRichContent(value) {
  return Boolean(textContent(value));
}

/** Deterministic, transparent review checks â€” never an AI or ATS score. */
export function getResumeQualityReview(state) {
  const contact = state?.contact || {};
  const workHistory = Array.isArray(state?.workHistory) ? state.workHistory : [];
  const education = Array.isArray(state?.education) ? state.education : [];
  const custom = Array.isArray(state?.extraSections?.custom) ? state.extraSections.custom : [];
  const skillText = textContent(state?.skills?.textContent);
  const ratedSkills = Array.isArray(state?.skills?.ratings) ? state.skills.ratings.filter(skill => textContent(skill?.name)) : [];
  const summaryWords = words(state?.summary?.content);
  const findings = [];

  if (!textContent(contact.firstName) && !textContent(contact.surname)) {
    findings.push({ id: 'name', level: 'required', title: 'Add your name', message: 'Recruiters need a clear identity at the top of your resume.' });
  }
  if (!textContent(contact.email)) {
    findings.push({ id: 'email', level: 'required', title: 'Add an email address', message: 'Include a professional email so employers can contact you.' });
  }
  if (!hasRichContent(state?.summary?.content)) {
    findings.push({ id: 'summary', level: 'recommended', title: 'Add a professional summary', message: 'A short summary makes the resume easier to scan.' });
  } else if (summaryWords.length > 90) {
    findings.push({ id: 'summary-length', level: 'tip', title: 'Shorten the summary', message: `It has ${summaryWords.length} words; aim for a concise opening.` });
  }
  if (!workHistory.length) {
    findings.push({ id: 'experience', level: 'recommended', title: 'Add work experience', message: 'Use internships, freelance work, or relevant projects if you are early career.' });
  } else {
    workHistory.forEach((entry, index) => {
      if (!hasRichContent(entry?.description)) {
        findings.push({ id: `experience-bullets-${entry?.id || index}`, level: 'recommended', title: 'Add experience details', message: `${entry?.jobTitle || 'This experience entry'} has no achievement bullets or description.` });
      }
      if (!textContent(entry?.startDate) && !textContent(entry?.endDate) && !entry?.currentJob) {
        findings.push({ id: `experience-dates-${entry?.id || index}`, level: 'tip', title: 'Add experience dates', message: `${entry?.jobTitle || 'This experience entry'} does not include dates.` });
      }
    });
  }
  if (!education.length) {
    findings.push({ id: 'education', level: 'tip', title: 'Add education', message: 'Include your most relevant qualification.' });
  }
  if (!skillText && !ratedSkills.length) {
    findings.push({ id: 'skills', level: 'recommended', title: 'Add relevant skills', message: 'List role-specific skills to help recruiters scan your fit.' });
  }
  custom.forEach(section => {
    if (!hasRichContent(section?.content)) {
      findings.push({ id: `empty-${section?.id}`, level: 'tip', title: `Complete ${textContent(section?.title) || 'this custom section'}`, message: 'Remove empty sections or add useful, role-relevant content.' });
    }
  });

  return findings;
}
