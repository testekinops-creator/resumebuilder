import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_SHOW_SKILL_RATINGS,
  normalizeSkillRatingVisibility,
  shouldShowSkillRatings,
} from '../src/utils/skillRatings.js';

test('skill ratings are hidden by default and require an explicit boolean true', () => {
  assert.equal(DEFAULT_SHOW_SKILL_RATINGS, false);
  assert.equal(shouldShowSkillRatings(), false);
  assert.equal(shouldShowSkillRatings({}), false);
  assert.equal(shouldShowSkillRatings({ showRatings: false }), false);
  assert.equal(shouldShowSkillRatings({ showRatings: 'true' }), false);
  assert.equal(shouldShowSkillRatings({ showRatings: 1 }), false);
  assert.equal(shouldShowSkillRatings({ showRatings: true }), true);
});

test('hydration normalization preserves rating data and only an explicit enabled choice', () => {
  const ratings = [{ id: 'skill-1', name: 'Testing', rating: 4 }];
  const legacy = normalizeSkillRatingVisibility({ textContent: '<ul><li>Testing</li></ul>', ratings });
  const disabled = normalizeSkillRatingVisibility({ ratings, showRatings: false });
  const enabled = normalizeSkillRatingVisibility({ ratings, showRatings: true });

  assert.equal(legacy.showRatings, false);
  assert.equal(disabled.showRatings, false);
  assert.equal(enabled.showRatings, true);
  assert.strictEqual(legacy.ratings, ratings);
  assert.strictEqual(enabled.ratings, ratings);
});
