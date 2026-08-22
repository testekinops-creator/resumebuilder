const normaliseSkillName = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const skillKey = (value) => normaliseSkillName(value).toLocaleLowerCase();

const stripHtml = (value = '') => normaliseSkillName(
  String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>'),
);

/**
 * Converts the skills rich-text value into the unique skill names displayed in
 * the text editor. List items are preferred, while line-based editor content
 * is supported for users who enter their own skill lines.
 */
export function getTextSkillNames(html = '') {
  const source = String(html || '');
  const listItems = [...source.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripHtml(match[1]));
  const values = listItems.length > 0
    ? listItems
    : source
      .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .split(/\n+/)
      .map(stripHtml);

  return values.reduce((skills, value) => {
    const name = normaliseSkillName(value);
    if (name && !skills.some((skill) => skillKey(skill) === skillKey(name))) {
      skills.push(name);
    }
    return skills;
  }, []);
}

/**
 * Keeps only auto-generated rating rows in sync with text-editor skills.
 * Manually added rows deliberately remain independent, including their stars.
 */
export function syncRatingsWithTextSkills(textContent, ratings = [], createId) {
  const textSkills = getTextSkillNames(textContent);
  const activeSkillKeys = new Set(textSkills.map(skillKey));
  const currentRatings = Array.isArray(ratings) ? ratings : [];
  const retainedRatings = currentRatings.filter((skill) => (
    skill?.source !== 'text' || activeSkillKeys.has(skillKey(skill.name))
  ));
  const existingSkillKeys = new Set(retainedRatings.map((skill) => skillKey(skill?.name)));
  const makeId = createId || ((index) => (
    `text-skill-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`
  ));

  const newRatings = textSkills
    .filter((name) => !existingSkillKeys.has(skillKey(name)))
    .map((name, index) => ({
      id: makeId(index, name),
      name,
      rating: 3,
      source: 'text',
    }));

  return [...retainedRatings, ...newRatings];
}
