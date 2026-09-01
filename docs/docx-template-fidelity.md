# DOCX template-fidelity audit

Status: implementation and automated verification completed, 2026-09-01. This is an editable, native-Word export—not a claim of pixel-identical rendering in every third-party viewer or a substitute for device testing.

## Shared contract

The catalogue attaches an immutable presentation descriptor to every template. `src/data/templatePresentation.js` defines reusable header, heading, entry, content, and column primitives; `src/utils/resumePresentation.js` resolves the selected template, current design, colors, typography, and per-template section layout. Preview and DOCX consume that contract. The PDF path still renders `ResumePreview`; it does not use the Word renderer.

Geometry is in CSS pixels: 1 px = 0.75 pt = 15 Word twips. Font size is converted to Word half-points. Default body sizes are 10/11/12 px for small/normal/large. Word font fallback is explicit; Inter and Helvetica currently map to Arial.

The `sidebar` field is a persisted semantic rail, not necessarily a narrow physical left column. Structured Finance uses semantic sidebar for its wide left experience column. Right-sidebar templates retain their independent saved section placement/order.

## Exact template mapping

Fractions below are before template-specific gutter and inner padding. Every row must retain its own identity; no export alias to Accountant, Classic, or another generic family is allowed.

| Template | Header | Section heading | Entry | Semantic sidebar |
| --- | --- | --- | --- | --- |
| classic — Classic Professional | classic-banner | underline | standard | Single |
| modern — Modern Executive | modern-split | modern-rule | standard | Single |
| professional — Corporate Standard | professional-centered | underline | standard | Single |
| creative — Elegant Sidebar | creative-sidebar | underline | standard | left 35.00% |
| minimal — Minimal Clean | minimal-left | plain | left-rule | Single |
| executive — Leadership Brief | executive-framed | underline | executive | Single |
| accountant — Structured Finance | accountant-band | plain | meta-first | left 64.75% (experience) |
| developer — Technical Engineer | developer-stacked | plain | developer-stacked | left 37.96% |
| timeline — Career Timeline | timeline-rule | underline | standard | left 27.27% |
| editorial — Editorial Profile | editorial-band | section-rule | standard | Single |
| ats-serif — ATS Serif | ats-serif-split | serif-section-rule | standard | Single |
| harbor — Left Accent | left-rule | offset | compact | Single |
| sapphire — Split Header | split | boxed | standard | Single |
| slate — Compact Sidebar | compact | tab | date-left | right 41.00% |
| aspen — Graduate Launch | band | numbered | standard | Single |
| orbit — Product Grid | grid | bracket | cards | left 31.00% |
| nova — Bold Typography | oversized | marker | stacked | Single |
| metro — Right Rail | left | underline | standard | right 31.00% |
| azure — Contemporary Band | title-band | pill | split-date | Single |
| ledger — Consulting Ledger | rule | smallcaps | date-left | left 25.00% |
| ivory — Academic Professional | centered-serif | serif-rule | academic | Single |
| cobalt — Corporate Split | dark-split | bar | standard | right 32.00% |
| sterling — Consulting Brief | memo | hairline | evidence | Single |
| canvas — Portfolio Grid | profile-tile | card | portfolio | left 31.00% |
| coral — Creative Banner | offset-banner | rounded | editorial | Single |
| prism — Modular Cards | module | card | cards | left 38.00% |
| muse — Vertical Accent | identity-panel | notch | editorial | left 41.00% |
| mono — Swiss Minimal | swiss | numbered | grid-entry | Single |
| nordic — Airy Sidebar | airy | soft-rule | standard | right 31.00% |
| pebble — Centered Minimal | centered | short-rule | quiet | Single |
| willow — Soft Rail | rail | leaf | quiet | left 31.00% |
| summit — Leadership Profile | top-rule | double-rule | outcome | Single |
| regal — Executive Sidebar | executive | crest | leadership | right 41.00% |
| onyx — High Contrast | black-band | block | impact | Single |
| bordeaux — Premium Executive | framed | diamond | leadership | left 31.00% |

## Content-format descriptors

- `entry.education` supplies title/subtitle field lists and separators, plus education-only typography overrides. A `degree` field means degree-or-level. Structured Finance uses `degree in field` as its title and school/location/date metadata; Corporate Standard uses school as its title and `degree in field - location` below it.
- `entry.metadataOrder` preserves subtitle-before-date metadata. Work history and education need not share the same title/subtitle presentation.
- `content.languages` distinguishes bulleted lists, stacked lines, and auto-fit grids. `content.websites` distinguishes the plain Creative sidebar from ordinary bullet lists.
- `content.personalDetails` records label text, label casing, inline-grid versus stacked-label layout, and spacing.
- `skills.sidebarTextVariant` is separate from named/rated skill layout. Creative named skills retain bullets; rich-text skills in its sidebar are plain stacked lines. Blueprint raw rich-text lists retain the preview's auto-column behavior unless inline/chips is selected.
- `page.frameConsumesSpace` is true for Leadership Brief (8 px border) and Premium Executive (14 px outer margin plus 1 px border). Technical Engineer's 12 px-inset decorative frame is an overlay and does not consume layout width.
- Custom sections resolve the selected template's `customHeading` descriptor in both the preview and DOCX. Legacy and reference templates inherit their native section treatment by default; blueprint custom sections use the active blueprint heading style. This prevents a generic accent-rule fallback from changing a template's hierarchy.

## Manual fidelity matrix still required

The source tests below exercise these conditions structurally for all templates. The remaining work is environment-specific visual review, not an approved silent substitution.

| Area | Required check |
| --- | --- |
| Native Word desktop | Inspect all 35 final `small` fixtures, then selected medium/large/long-text/customized cases for header, rail, page-frame, and pagination fidelity. |
| Word mobile/tablet | Open representative one- and two-column documents in Word for iOS/Android and a tablet viewport. Check reflow, list indentation, and page boundaries. |
| Google Docs | Import representative documents to confirm text remains editable and semantic lists/links survive. |
| Browser side-by-side | Compare the current in-app preview with the same final fixture state when the local preview is available again. |
| Fonts and wrapping | Compare line breaks/page counts where a device substitutes the documented Word fallback font. |

## Preview/PDF regression risk

The shared UI integration preserves established default values for name sizes, column ratios, gutters, header/body spacing, labels, and fonts. It changes where those values originate, not the selected template. The PDF renderer continues to render `ResumePreview`; the DOCX renderer is only used for DOCX exports.

Existing preview edge cases should not be mistaken for new Word renderer behavior: Classic/Creative names can inherit the global heading color, and the post-render section-title renamer can remove a numbered heading's decorative marker. Those are separate shared-preview concerns; no unverified visual correction is claimed here.

## Verification status

| Check | Status |
| --- | --- |
| Catalogue coverage | All 35 template descriptors resolve; the exact mapping above is generated from the catalogue. |
| Structural/behavior tests | Passed: 163 tests using Node's single-process runner, including all 35 templates and five reusable fixtures each. |
| Production build/lint | Passed: `npm run lint` and `npm run build -- --configLoader native`. |
| Editable QA batch | Generated: 175 native DOCX fixtures (35 templates × small, medium, large, long-text, customized) under ignored `tmp/docx-fidelity/current/`. |
| Word desktop comparison | Native Word smoke review completed for Modern, Developer, Creative, Accountant, Timeline, Coral, Bordeaux, Orbit, Regal, Prism, and a customized Developer fixture. This covers one- and two-column flow, frames, rails, grids, cards, custom titles/order/column placement, and a natural Coral two-page continuation. The final all-35-template/current-fixture visual matrix remains manual QA. |
| Browser preview comparison | The in-app preview is reachable and its Finalize/Choose Template layout smoke checks passed. The actual DOCX action now gives a specific empty-resume recovery message rather than a misleading retry prompt. A same-fixture, side-by-side visual comparison against every final DOCX remains manual QA. |
| Word iOS/Android/tablet | Not verified in this audit. |
| Google Docs | Not verified in this audit. |
| Light/dark, customization, long-field comparison | Automated state/fixture coverage passed; device-level visual matrix remains pending. |

Do not close the P0 solely because every generated file opens. The final check must compare template identity, header, section treatment, column placement, content, colors, and pagination against the same current resume state.
