import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';

const ResumeContext = createContext(null);

const DEFAULT_STATE = {
  meta: {
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
  skills: { textContent: '', ratings: [] },
  summary: { content: '' },
  extraSections: { selected: [], custom: [] },
  personalDetails: {
    dob: '', nationality: '', maritalStatus: '',
    visaStatus: '', gender: '', additionalInfo: [],
  },
  websites: [],
  certifications: { content: '' },
  languages: [],
  design: {
    colorScheme: '#6B21A8',
    sectionOrder: ['summary', 'websites', 'skills', 'workHistory', 'education', 'personalDetails', 'certifications'],
    fontStyle: 'normal',
    fontFamily: 'Inter',
    sectionSpacing: 50,
    paragraphSpacing: 50,
    lineSpacing: 50,
  },
  _history: { past: [], future: [] },
};

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
    case 'SET_META':
      return saveHistory({ ...state, meta: { ...state.meta, ...action.payload } });
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
      return saveHistory({ ...state, skills: { ...state.skills, ...action.payload } });

    case 'SET_SUMMARY':
      return saveHistory({ ...state, summary: { ...state.summary, ...action.payload } });

    case 'SET_EXTRA_SECTIONS':
      return saveHistory({ ...state, extraSections: { ...state.extraSections, ...action.payload } });

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
      const newLang = { id: Date.now().toString(), language: '', level: 'Bilingual or Proficient (C2)', ...action.payload };
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
      return saveHistory({ ...state, certifications: { ...state.certifications, ...action.payload } });

    case 'SET_DESIGN':
      return saveHistory({ ...state, design: { ...state.design, ...action.payload } });

    case 'REORDER_SECTIONS':
      return saveHistory({ ...state, design: { ...state.design, sectionOrder: action.payload } });

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
      return { ...action.payload, _history: { past: [], future: [] } };

    case 'RESET':
      return { ...DEFAULT_STATE, _history: { past: [], future: [] } };

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
        return { ...DEFAULT_STATE, ...parsed, _history: { past: [], future: [] } };
      }
    }
  } catch (e) {
    console.warn('Failed to load saved resume data:', e);
  }
  return DEFAULT_STATE;
}

export function ResumeProvider({ children }) {
  const [state, dispatch] = useReducer(resumeReducer, null, loadInitialState);
  const saveTimeoutRef = useRef(null);

  // Auto-save debounced
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const toSave = { ...state };
        delete toSave._history;
        localStorage.setItem('resumeBuilder_state', JSON.stringify(toSave));
      } catch (e) {
        console.warn('Failed to save resume data:', e);
      }
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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

export function useResume() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
}

export { DEFAULT_STATE };
