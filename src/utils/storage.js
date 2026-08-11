const STORAGE_KEY = 'resumeBuilder_state';

export function isStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function saveResume(data) {
  try {
    const toSave = { ...data };
    delete toSave._history;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return { success: true };
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      return { success: false, error: 'Storage full. Export your resume to free space.' };
    }
    return { success: false, error: 'Failed to save data.' };
  }
}

export function loadResume() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function clearResume() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function exportResumeJSON(data) {
  try {
    const toExport = { ...data };
    delete toExport._history;
    const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.meta?.name || 'resume'}_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Failed to export data.' };
  }
}

export function importResumeJSON(file) {
  return new Promise((resolve, reject) => {
    if (!file || file.type !== 'application/json') {
      reject(new Error('Please upload a valid JSON file.'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('File is too large (max 10MB).'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.contact || !data.meta) {
          reject(new Error('Invalid resume data format.'));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error('Failed to parse JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

/* ===== Multi-Resume Management ===== */
const RESUMES_INDEX_KEY = 'resumeBuilder_resumes';
const RESUME_PREFIX = 'resumeBuilder_resume_';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function listResumes() {
  try {
    const index = localStorage.getItem(RESUMES_INDEX_KEY);
    return index ? JSON.parse(index) : [];
  } catch {
    return [];
  }
}

function saveResumeIndex(index) {
  localStorage.setItem(RESUMES_INDEX_KEY, JSON.stringify(index));
}

export function saveResumeById(id, data) {
  try {
    const toSave = { ...data };
    delete toSave._history;
    localStorage.setItem(RESUME_PREFIX + id, JSON.stringify(toSave));

    // Update index
    const index = listResumes();
    const existing = index.findIndex(r => r.id === id);
    const entry = {
      id,
      name: data.meta?.name || 'Untitled Resume',
      updatedAt: new Date().toISOString(),
      templateId: data.meta?.templateId || 'classic',
      completeness: data._completeness || 0,
    };
    if (existing >= 0) {
      index[existing] = { ...index[existing], ...entry };
    } else {
      entry.createdAt = new Date().toISOString();
      index.unshift(entry);
    }
    saveResumeIndex(index);
    return { success: true, id };
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      return { success: false, error: 'Storage full.' };
    }
    return { success: false, error: 'Failed to save.' };
  }
}

export function loadResumeById(id) {
  try {
    const data = localStorage.getItem(RESUME_PREFIX + id);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function deleteResumeById(id) {
  try {
    localStorage.removeItem(RESUME_PREFIX + id);
    const index = listResumes().filter(r => r.id !== id);
    saveResumeIndex(index);
    return true;
  } catch {
    return false;
  }
}

export function duplicateResume(id) {
  const data = loadResumeById(id);
  if (!data) return null;
  const newId = generateId();
  data.meta = { ...data.meta, name: `${data.meta?.name || 'Resume'} (Copy)` };
  saveResumeById(newId, data);
  return newId;
}

export function createNewResumeId() {
  return generateId();
}
