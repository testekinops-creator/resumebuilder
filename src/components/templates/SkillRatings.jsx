import { shouldShowSkillRatings } from '../../utils/skillRatings';

function normalizedRating(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(5, Math.max(1, Math.round(numeric))) : 1;
}

/** Displays named skills, with ratings only when the resume presentation enables them. */
export default function SkillRatings({ ratings = [], showRatings }) {
  const visibleRatings = (Array.isArray(ratings) ? ratings : []).filter(skill => skill?.name?.trim());
  const displayRatings = shouldShowSkillRatings({ showRatings });
  if (!visibleRatings.length) return null;

  return (
    <ul className={`tmpl-skill-ratings${displayRatings ? '' : ' tmpl-skill-names-only'}`} aria-label={displayRatings ? 'Skill ratings' : 'Skills'}>
      {visibleRatings.map(skill => {
        const rating = normalizedRating(skill.rating);
        return (
          <li className="tmpl-skill-rating" key={skill.id || skill.name}>
            <span className="tmpl-skill-name">
              <span className="tmpl-skill-bullet" aria-hidden="true">•</span>
              <span>{skill.name.trim()}</span>
            </span>
            {displayRatings && (
              <span className="tmpl-skill-stars" aria-label={`${rating} out of 5`}>
              <span aria-hidden="true">{'★'.repeat(rating)}</span>
              <span className="tmpl-skill-stars-empty" aria-hidden="true">{'★'.repeat(5 - rating)}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
