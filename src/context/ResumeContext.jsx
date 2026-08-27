import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { createNewResumeId, saveResumeById } from '../utils/storage';
import { DEFAULT_RESUME_SECTION_ORDER, getOrderedSectionIds, getTemplateSectionLayout, RESUME_SECTION_LABELS } from '../utils/resumeSections';
import { isCustomSectionId } from '../utils/optionalSections';
import { sanitizeHTML } from '../utils/sanitize';
import { DEFAULT_SHOW_SKILL_RATINGS, normalizeSkillRatingVisibility } from '../utils/skillRatings';
import { replaceIssueInResume } from '../utils/resumeQuality';
import { getTemplateTheme } from '../data/templates';

const ResumeContext = createContext(null);

function uniqueIds(ids = []) {
  const seen = new Set();
  return ids.filter((id) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function defaultCustomSectionTitle(id) {
  return RESUME_SECTION_LABELS[id] || 'Custom Section';
}

// Rich text can originate from an imported backup as well as the editor.
// Normalize it at the state boundary so preview and export never receive
// executable or unsupported markup from a JSON/PDF/DOCX import.
function safeRichText(content) {
  return typeof content === 'string' ? sanitizeHTML(content) : '';
}

function normalizeExtraSections(extraSections = {}) {
  const selected = uniqueIds(Array.isArray(extraSections.selected) ? extraSections.selected : []);
  const customIds = selected.filter(isCustomSectionId);
  const customIdSet = new Set(customIds);
  const sectionsById = new Map();

  (Array.isArray(extraSections.custom) ? extraSections.custom : []).forEach((section) => {
    if (!section?.id || !customIdSet.has(section.id) || sectionsById.has(section.id)) return;
    sectionsById.set(section.id, {
      id: section.id,
      title: typeof section.title === 'string'
        ? section.title.slice(0, 60)
        : defaultCustomSectionTitle(section.id),
      content: safeRichText(section.content),
    });
  });

  return {
    ...extraSections,
    selected,
    custom: customIds.map(id => sectionsById.get(id) || {
      id,
      title: defaultCustomSectionTitle(id),
      content: '',
    }),
  };
}

function normalizeSectionColumns(sectionColumns, sectionIds) {
  const knownIds = new Set(sectionIds);
  return Object.entries(sectionColumns || {}).reduce((columns, [sectionId, column]) => {
    if (knownIds.has(sectionId) && (column === 'sidebar' || column === 'main')) {
      columns[sectionId] = column;
    }
    return columns;
  }, {});
}

function normalizeSectionOrder(sectionOrder, sectionIds) {
  const knownIds = new Set(sectionIds);
  const seen = new Set();
  return [...(Array.isArray(sectionOrder) ? sectionOrder : []), ...sectionIds].filter((sectionId) => {
    if (!knownIds.has(sectionId) || seen.has(sectionId)) return false;
    seen.add(sectionId);
    return true;
  });
}

function normalizeTemplateLayouts(templateLayouts, sectionIds) {
  return Object.entries(templateLayouts || {}).reduce((layouts, [templateId, layout]) => {
    if (!templateId || !layout || typeof layout !== 'object') return layouts;
    const sectionOrder = normalizeSectionOrder(layout.sectionOrder, sectionIds);
    layouts[templateId] = {
      sectionOrder,
      sectionColumns: normalizeSectionColumns(layout.sectionColumns, sectionOrder),
    };
    return layouts;
  }, {});
}

function hasTemplateLayoutRecords(templateLayouts) {
  return templateLayouts
    && typeof templateLayouts === 'object'
    && Object.keys(templateLayouts).length > 0;
}

function withActiveTemplateLayout(state, layout) {
  const templateId = state.meta?.templateId || 'classic';
  return {
    ...state.design,
    // Keep these mirrors while older JSON backups are still in circulation.
    // All renderers read templateLayouts, never these global fallbacks.
    sectionOrder: layout.sectionOrder,
    sectionColumns: layout.sectionColumns,
    templateLayouts: {
      ...(state.design?.templateLayouts || {}),
      [templateId]: layout,
    },
  };
}

function syncExtraSectionsAndOrder(state) {
  const nextState = { ...state, extraSections: normalizeExtraSections(state.extraSections) };
  const sectionIds = getOrderedSectionIds(nextState);
  const templateLayouts = normalizeTemplateLayouts(nextState.design?.templateLayouts, sectionIds);
  const activeLayout = templateLayouts[nextState.meta?.templateId];
  const sectionOrder = activeLayout?.sectionOrder || sectionIds;
  const sectionColumns = activeLayout?.sectionColumns || {};
  return {
    ...nextState,
    design: {
      ...nextState.design,
      sectionOrder,
      sectionColumns,
      templateLayouts,
    },
  };
}

function createCustomSectionId(existingIds) {
  let id;
  do {
    id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existingIds.has(id));
  return id;
}

function createDefaultState() {
  return {
  meta: {
    id: createNewResumeId(),
    name: 'My Resume',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateId: 'classic',
    experienceLevel: '',
    furthestStepReached: 0,
  },
  contact: {
    firstName: '', surname: '', city: '', country: '',
    pinCode: '', phone: '', email: '',
    linkedIn: '', website: '', drivingLicence: '',
  },
  workHistory: [],
  education: [],
  // Rating data remains available even when the resume displays plain skills.
  skills: { textContent: '', ratings: [], showRatings: DEFAULT_SHOW_SKILL_RATINGS },
  summary: { content: '' },
  extraSections: { selected: [], custom: [] },
  personalDetails: {
    dob: '', nationality: '', maritalStatus: '',
    visaStatus: '', gender: '', additionalInfo: [],
  },
  websites: [],
  certifications: { content: '' },
  languages: [],
  // Import metadata contains review guidance only. Raw uploaded document text
  // and files are intentionally never persisted in browser storage.
  importMeta: { quality: null, needsReview: [], sections: [], importedAt: null },
  design: {
    themePreset: 'default',
    colorScheme: '#6B21A8',
    headingColor: '#6B21A8',
    sidebarColor: '#4C1D95',
    dividerColor: '#C4B5FD',
    sectionOrder: [...DEFAULT_RESUME_SECTION_ORDER],
    fontStyle: 'normal',
    fontFamily: 'Inter',
    sectionSpacing: 50,
    paragraphSpacing: 50,
    lineSpacing: 50,
    pageMargin: 32,
    headingLetterSpacing: 0.5,
    pageBorder: 'none',
    sectionTitles: {},
    sectionColumns: {},
    templateLayouts: {
      classic: { sectionOrder: [...DEFAULT_RESUME_SECTION_ORDER], sectionColumns: {} },
    },
  },
    _history: { past: [], future: [] },
  };
}

function hydrateState(savedState) {
  const defaults = createDefaultState();
  const saved = savedState && typeof savedState === 'object' ? savedState : {};

  const savedTemplateLayouts = saved.design?.templateLayouts;
  const hasTemplateLayouts = hasTemplateLayoutRecords(savedTemplateLayouts);
  const legacyTemplateId = saved.meta?.templateId || defaults.meta.templateId;
  const migratedTemplateLayouts = hasTemplateLayouts
    ? savedTemplateLayouts
    : {
      [legacyTemplateId]: {
        sectionOrder: Array.isArray(saved.design?.sectionOrder)
          ? saved.design.sectionOrder
          : defaults.design.sectionOrder,
        sectionColumns: saved.design?.sectionColumns || defaults.design.sectionColumns,
      },
    };
  const savedDesign = saved.design && typeof saved.design === 'object' ? saved.design : {};
  const hasThemeMetadata = ['headingColor', 'sidebarColor', 'dividerColor', 'themePreset']
    .some(key => Object.prototype.hasOwnProperty.call(savedDesign, key));
  const migratedTheme = hasThemeMetadata
    ? {}
    : (() => {
      const theme = getTemplateTheme(legacyTemplateId, undefined, { accent: savedDesign.colorScheme });
      return {
        themePreset: theme.id,
        colorScheme: theme.colors.accent,
        headingColor: theme.colors.heading,
        sidebarColor: theme.colors.sidebar,
        dividerColor: theme.colors.divider,
      };
    })();

  const hydrated = {
    ...defaults,
    ...saved,
    meta: { ...defaults.meta, ...saved.meta, id: saved.meta?.id || defaults.meta.id },
    contact: { ...defaults.contact, ...saved.contact },
    workHistory: Array.isArray(saved.workHistory)
      ? saved.workHistory.map(entry => ({ ...entry, description: safeRichText(entry?.description) }))
      : defaults.workHistory,
    education: Array.isArray(saved.education)
      ? saved.education.map(entry => ({ ...entry, coursework: safeRichText(entry?.coursework) }))
      : defaults.education,
    skills: normalizeSkillRatingVisibility({
      ...defaults.skills,
      ...(saved.skills && typeof saved.skills === 'object' ? saved.skills : {}),
      textContent: safeRichText(saved.skills?.textContent),
    }),
    summary: { ...defaults.summary, ...saved.summary, content: safeRichText(saved.summary?.content) },
    extraSections: { ...defaults.extraSections, ...saved.extraSections },
    personalDetails: { ...defaults.personalDetails, ...saved.personalDetails },
    websites: Array.isArray(saved.websites) ? saved.websites : defaults.websites,
    certifications: { ...defaults.certifications, ...saved.certifications, content: safeRichText(saved.certifications?.content) },
    languages: Array.isArray(saved.languages) ? saved.languages : defaults.languages,
    importMeta: {
      ...defaults.importMeta,
      ...saved.importMeta,
      needsReview: Array.isArray(saved.importMeta?.needsReview) ? saved.importMeta.needsReview : [],
      sections: Array.isArray(saved.importMeta?.sections) ? saved.importMeta.sections : [],
    },
    design: { ...defaults.design, ...migratedTheme, ...savedDesign, templateLayouts: migratedTemplateLayouts },
    _history: { past: [], future: [] },
  };
  return syncExtraSectionsAndOrder(hydrated);
}

function calculateCompleteness(state) {
  let score = 0;
  if (state.contact.email) score += 10;
  if (state.contact.firstName || state.contact.surname) score += 10;
  if (state.workHistory.length > 0) {
    score += 15;
    if (state.workHistory.some(w => w.description)) score += 10;
  }
  if (state.education.length > 0) score += 15;
  if (state.skills.textContent || state.skills.ratings.length > 0) score += 15;
  if (state.summary.content) score += 10;
  if (state.extraSections.selected.length > 0 || state.meta.templateId) score += 15;
  return Math.min(score, 100);
}

function resumeReducer(state, action) {
  const saveHistory = (newState) => ({
    ...newState,
    _history: {
      past: [...state._history.past.slice(-49), { ...state, _history: undefined }],
      future: [],
    },
    meta: { ...newState.meta, updatedAt: new Date().toISOString() },
  });

  switch (action.type) {
    case 'UPDATE_FURTHEST_STEP':
      if (action.payload > (state.meta.furthestStepReached || 0)) {
        return { ...state, meta: { ...state.meta, furthestStepReached: action.payload } };
      }
      return state;
    case 'SET_META': {
      const nextMeta = { ...state.meta, ...action.payload };
      const isTemplateSwitch = action.payload?.templateId && action.payload.templateId !== state.meta?.templateId;
      if (isTemplateSwitch && !hasTemplateLayoutRecords(state.design?.templateLayouts)) {
        const activeTemplateId = state.meta?.templateId || 'classic';
        return saveHistory({
          ...state,
          meta: nextMeta,
          design: {
            ...state.design,
            templateLayouts: {
              [activeTemplateId]: {
                sectionOrder: Array.isArray(state.design?.sectionOrder) ? state.design.sectionOrder : [],
                sectionColumns: state.design?.sectionColumns || {},
              },
            },
          },
        });
      }
      return saveHistory({ ...state, meta: nextMeta });
    }
    case 'SET_CONTACT':
      return saveHistory({ ...state, contact: { ...state.contact, ...action.payload } });

    case 'ADD_WORK': {
      const newWork = {
        id: Date.now().toString(),
        jobTitle: '', employer: '', location: '',
        remote: false, startDate: '', endDate: '',
        currentJob: false, description: '', purpose: '',
        ...action.payload,
      };
      return saveHistory({ ...state, workHistory: [...state.workHistory, newWork] });
    }
    case 'UPDATE_WORK':
      return saveHistory({
        ...state,
        workHistory: state.workHistory.map(w =>
          w.id === action.payload.id ? { ...w, ...action.payload } : w
        ),
      });
    case 'DELETE_WORK':
      return saveHistory({
        ...state,
        workHistory: state.workHistory.filter(w => w.id !== action.payload),
      });

    case 'ADD_EDUCATION': {
      const newEdu = {
        id: Date.now().toString(),
        level: '', schoolName: '', location: '',
        degree: '', fieldOfStudy: '', graduationDate: '',
        coursework: '',
        ...action.payload,
      };
      return saveHistory({ ...state, education: [...state.education, newEdu] });
    }
    case 'UPDATE_EDUCATION':
      return saveHistory({
        ...state,
        education: state.education.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e
        ),
      });
    case 'DELETE_EDUCATION':
      return saveHistory({
        ...state,
        education: state.education.filter(e => e.id !== action.payload),
      });

    case 'SET_SKILLS':
      return saveHistory({
        ...state,
        skills: normalizeSkillRatingVisibility({
          ...state.skills,
          ...action.payload,
          ...(action.payload?.textContent === undefined ? {} : { textContent: safeRichText(action.payload.textContent) }),
        }),
      });

    case 'SET_SUMMARY':
      return saveHistory({
        ...state,
        summary: {
          ...state.summary,
          ...action.payload,
          ...(action.payload?.content === undefined ? {} : { content: safeRichText(action.payload.content) }),
        },
      });

    case 'SET_EXTRA_SECTIONS': {
      const nextState = { ...state, extraSections: { ...state.extraSections, ...action.payload } };
      return saveHistory(syncExtraSectionsAndOrder(nextState));
    }

    case 'ADD_CUSTOM_SECTION': {
      const currentExtraSections = normalizeExtraSections(state.extraSections);
      const existingIds = new Set(currentExtraSections.custom.map(section => section.id));
      const requestedId = action.payload?.id;
      const id = requestedId && !existingIds.has(requestedId)
        ? requestedId
        : requestedId || createCustomSectionId(existingIds);
      if (existingIds.has(id)) return state;

      const nextState = {
        ...state,
        extraSections: {
          ...currentExtraSections,
          selected: [...currentExtraSections.selected, id],
          custom: [...currentExtraSections.custom, {
            id,
            title: String(action.payload?.title || defaultCustomSectionTitle(id)).slice(0, 60),
            content: '',
          }],
        },
      };
      return saveHistory(syncExtraSectionsAndOrder(nextState));
    }

    case 'UPDATE_CUSTOM_SECTION': {
      const { id, title, content } = action.payload || {};
      const currentExtraSections = normalizeExtraSections(state.extraSections);
      if (!id || !currentExtraSections.custom.some(section => section.id === id)) return state;

      const nextState = {
        ...state,
        extraSections: {
          ...currentExtraSections,
          custom: currentExtraSections.custom.map(section => (
            section.id === id
              ? {
                ...section,
                ...(title === undefined ? {} : { title: String(title).slice(0, 60) }),
                ...(content === undefined ? {} : { content: safeRichText(content) }),
              }
              : section
          )),
        },
      };
      return saveHistory(syncExtraSectionsAndOrder(nextState));
    }

    case 'REMOVE_CUSTOM_SECTION': {
      const id = action.payload;
      const currentExtraSections = normalizeExtraSections(state.extraSections);
      if (!currentExtraSections.custom.some(section => section.id === id)) return state;

      const nextState = {
        ...state,
        extraSections: {
          ...currentExtraSections,
          selected: currentExtraSections.selected.filter(sectionId => sectionId !== id),
          custom: currentExtraSections.custom.filter(section => section.id !== id),
        },
      };
      return saveHistory(syncExtraSectionsAndOrder(nextState));
    }

    case 'SET_PERSONAL_DETAILS':
      return saveHistory({ ...state, personalDetails: { ...state.personalDetails, ...action.payload } });

    case 'ADD_WEBSITE': {
      const newSite = { id: Date.now().toString(), url: '', addToHeader: false, ...action.payload };
      return saveHistory({ ...state, websites: [...state.websites, newSite] });
    }
    case 'UPDATE_WEBSITE':
      return saveHistory({
        ...state,
        websites: state.websites.map(w =>
          w.id === action.payload.id ? { ...w, ...action.payload } : w
        ),
      });
    case 'DELETE_WEBSITE':
      return saveHistory({
        ...state,
        websites: state.websites.filter(w => w.id !== action.payload),
      });

    case 'ADD_LANGUAGE': {
      const newLang = { id: Date.now().toString(), language: '', ...action.payload };
      return saveHistory({ ...state, languages: [...state.languages, newLang] });
    }
    case 'UPDATE_LANGUAGE':
      return saveHistory({
        ...state,
        languages: state.languages.map(l =>
          l.id === action.payload.id ? { ...l, ...action.payload } : l
        ),
      });
    case 'DELETE_LANGUAGE':
      return saveHistory({
        ...state,
        languages: state.languages.filter(l => l.id !== action.payload),
      });

    case 'SET_CERTIFICATIONS':
      return saveHistory({
        ...state,
        certifications: {
          ...state.certifications,
          ...action.payload,
          ...(action.payload?.content === undefined ? {} : { content: safeRichText(action.payload.content) }),
        },
      });

    case 'IMPORT_RESUME_DATA': {
      const imported = action.payload && typeof action.payload === 'object' ? action.payload : {};
      const defaults = createDefaultState();
      const nextState = hydrateState({
        ...defaults,
        meta: {
          ...defaults.meta,
          name: String(imported.resumeName || defaults.meta.name).slice(0, 50),
          furthestStepReached: 1,
        },
        contact: { ...defaults.contact, ...imported.contact },
        summary: { ...defaults.summary, ...imported.summary },
        // Uploaded files supply resume content, not a presentation preference.
        // Keep imported rating data editable but require the user to opt in to
        // displaying it on the resume.
        skills: { ...defaults.skills, ...imported.skills, showRatings: DEFAULT_SHOW_SKILL_RATINGS },
        workHistory: Array.isArray(imported.workHistory) ? imported.workHistory : [],
        education: Array.isArray(imported.education) ? imported.education : [],
        extraSections: { ...defaults.extraSections, ...imported.extraSections },
        websites: Array.isArray(imported.websites) ? imported.websites : [],
        certifications: { ...defaults.certifications, ...imported.certifications },
        languages: Array.isArray(imported.languages) ? imported.languages : [],
        importMeta: { ...defaults.importMeta, ...imported.importMeta },
      });
      // Import starts a distinct resume and leaves the previous state in Undo,
      // avoiding accidental merges or irreversible replacement.
      return saveHistory(nextState);
    }

    case 'SET_DESIGN':
      return saveHistory({ ...state, design: { ...state.design, ...action.payload } });

    case 'APPLY_QUALITY_FIX': {
      const nextState = replaceIssueInResume(state, action.payload?.finding, action.payload?.replacement);
      return nextState === state ? state : saveHistory(nextState);
    }

    case 'SET_SECTION_TITLE': {
      const { sectionId, title } = action.payload;
      const sectionTitles = { ...(state.design.sectionTitles || {}) };
      if (title?.trim()) sectionTitles[sectionId] = title.trim().slice(0, 60);
      else delete sectionTitles[sectionId];
      return saveHistory({ ...state, design: { ...state.design, sectionTitles } });
    }

    case 'REMOVE_SECTION': {
      const sectionId = action.payload;
      const clearOptionalState = {
        ...state,
        extraSections: {
          ...state.extraSections,
          selected: (state.extraSections.selected || []).filter(id => id !== sectionId),
          custom: (state.extraSections.custom || []).filter(section => section.id !== sectionId),
        },
      };

      let nextState;
      switch (sectionId) {
        case 'summary':
          nextState = { ...clearOptionalState, summary: { ...state.summary, content: '' } };
          break;
        case 'workHistory':
          nextState = { ...clearOptionalState, workHistory: [] };
          break;
        case 'education':
          nextState = { ...clearOptionalState, education: [] };
          break;
        case 'skills':
          nextState = { ...clearOptionalState, skills: { ...state.skills, textContent: '', ratings: [] } };
          break;
        case 'personalDetails':
          nextState = { ...clearOptionalState, personalDetails: { ...createDefaultState().personalDetails } };
          break;
        case 'websites':
          nextState = { ...clearOptionalState, websites: [] };
          break;
        case 'certifications':
          nextState = { ...clearOptionalState, certifications: { ...state.certifications, content: '' } };
          break;
        case 'languages':
          nextState = { ...clearOptionalState, languages: [] };
          break;
        default:
          nextState = clearOptionalState;
      }
      return saveHistory(syncExtraSectionsAndOrder(nextState));
    }

    case 'REORDER_SECTIONS': {
      const requestedOrder = Array.isArray(action.payload) ? action.payload : [];
      const orderedIds = getOrderedSectionIds(state);
      const allowedIds = new Set(orderedIds);
      const seen = new Set();
      const nextOrder = [...requestedOrder, ...orderedIds].filter((id) => {
        if (!allowedIds.has(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      const currentLayout = getTemplateSectionLayout(state);
      return saveHistory(syncExtraSectionsAndOrder({
        ...state,
        design: withActiveTemplateLayout(state, {
          sectionOrder: nextOrder,
          sectionColumns: currentLayout.sectionColumns,
        }),
      }));
    }

    case 'UPDATE_SECTION_LAYOUT': {
      const requestedOrder = Array.isArray(action.payload?.sectionOrder) ? action.payload.sectionOrder : [];
      const orderedIds = getOrderedSectionIds(state);
      const allowedIds = new Set(orderedIds);
      const seen = new Set();
      const sectionOrder = [...requestedOrder, ...orderedIds].filter((id) => {
        if (!allowedIds.has(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      const sectionColumns = normalizeSectionColumns(action.payload?.sectionColumns, sectionOrder);
      return saveHistory(syncExtraSectionsAndOrder({
        ...state,
        design: withActiveTemplateLayout(state, { sectionOrder, sectionColumns }),
      }));
    }

    case 'UNDO': {
      if (state._history.past.length === 0) return state;
      const previous = state._history.past[state._history.past.length - 1];
      return {
        ...previous,
        _history: {
          past: state._history.past.slice(0, -1),
          future: [{ ...state, _history: undefined }, ...state._history.future],
        },
      };
    }
    case 'REDO': {
      if (state._history.future.length === 0) return state;
      const next = state._history.future[0];
      return {
        ...next,
        _history: {
          past: [...state._history.past, { ...state, _history: undefined }],
          future: state._history.future.slice(1),
        },
      };
    }

    case 'LOAD_STATE':
      return hydrateState(action.payload);

    case 'RESET':
      return createDefaultState();

    default:
      return state;
  }
}

function loadInitialState() {
  try {
    const saved = localStorage.getItem('resumeBuilder_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Basic schema validation
      if (parsed && parsed.contact && parsed.meta) {
        return hydrateState(parsed);
      }
    }
  } catch (e) {
    console.warn('Failed to load saved resume data:', e);
  }
  return createDefaultState();
}

function persistResumeState(state) {
  try {
    const toSave = { ...state };
    delete toSave._history;
    localStorage.setItem('resumeBuilder_state', JSON.stringify(toSave));
    saveResumeById(state.meta.id, toSave, calculateCompleteness(state));
  } catch (error) {
    console.warn('Failed to save resume data:', error);
  }
}

export function ResumeProvider({ children }) {
  const [state, dispatch] = useReducer(resumeReducer, null, loadInitialState);
  const saveTimeoutRef = useRef(null);

  // Auto-save debounced
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistResumeState(state);
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [state]);

  // Do not lose the latest edit when a browser session is closed before debounce completes.
  useEffect(() => {
    const saveImmediately = () => persistResumeState(state);
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden') saveImmediately();
    };

    window.addEventListener('pagehide', saveImmediately);
    document.addEventListener('visibilitychange', saveWhenHidden);
    return () => {
      window.removeEventListener('pagehide', saveImmediately);
      document.removeEventListener('visibilitychange', saveWhenHidden);
    };
  }, [state]);

  const completeness = calculateCompleteness(state);
  const canUndo = state._history.past.length > 0;
  const canRedo = state._history.future.length > 0;

  const value = {
    state,
    dispatch,
    completeness,
    canUndo,
    canRedo,
  };

  return (
    <ResumeContext.Provider value={value}>
      {children}
    </ResumeContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components
export function useResume() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
}
