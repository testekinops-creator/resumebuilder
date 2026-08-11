import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listResumes, deleteResumeById, duplicateResume, loadResumeById, exportResumeJSON, createNewResumeId } from '../../utils/storage';
import { useTheme } from '../../hooks/useTheme';
import './Dashboard.css';

export default function Dashboard() {
  const [resumes, setResumes] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  useEffect(() => {
    setResumes(listResumes());
  }, []);

  const handleDelete = (id) => {
    deleteResumeById(id);
    setResumes(listResumes());
    setConfirmDelete(null);
  };

  const handleDuplicate = (id) => {
    const newId = duplicateResume(id);
    if (newId) setResumes(listResumes());
  };

  const handleExport = (id) => {
    const data = loadResumeById(id);
    if (data) exportResumeJSON(data);
  };

  const handleNewResume = () => {
    navigate('/get-started');
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const templateColors = {
    classic: '#6B21A8',
    modern: '#3B82F6',
    professional: '#059669',
    creative: '#DC2626',
    minimal: '#6B7280',
    executive: '#1E293B',
  };

  return (
    <div className="dashboard">
      {/* Top Bar */}
      <header className="dash-header">
        <Link to="/" className="dash-brand">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="dashLogoGrad" x1="0" y1="0" x2="32" y2="32">
                <stop offset="0%" stopColor="#E84D39" />
                <stop offset="100%" stopColor="#E91E8C" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#dashLogoGrad)" />
            <path d="M8 8h6v16H8V8zm10 0h6v4h-6V8zm0 6h6v4h-6v-4zm0 6h6v4h-6v-4z" fill="white" opacity="0.9" />
          </svg>
          <span>Resume Builder</span>
        </Link>
        <div className="dash-header-actions">
          <button className="btn-icon theme-toggle" onClick={toggle} title={isDark ? 'Light Mode' : 'Dark Mode'}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <button className="btn btn-accent btn-sm" onClick={handleNewResume}>
            + New Resume
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dash-main">
        <div className="dash-hero">
          <h1>My Resumes</h1>
          <p>Manage all your resumes in one place. Create, edit, duplicate, or export.</p>
        </div>

        {resumes.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon">📄</div>
            <h2>No resumes yet</h2>
            <p>Create your first professional resume in minutes.</p>
            <button className="btn btn-primary" onClick={handleNewResume}>
              + Create My First Resume
            </button>
          </div>
        ) : (
          <div className="dash-grid">
            {/* New Resume Card */}
            <div className="dash-card dash-card-new" onClick={handleNewResume}>
              <div className="dash-card-new-icon">+</div>
              <span>New Resume</span>
            </div>

            {/* Resume Cards */}
            {resumes.map(resume => (
              <div key={resume.id} className="dash-card">
                <div className="dash-card-preview" style={{
                  background: `linear-gradient(135deg, ${templateColors[resume.templateId] || '#6B21A8'}22, ${templateColors[resume.templateId] || '#6B21A8'}44)`,
                  borderTop: `4px solid ${templateColors[resume.templateId] || '#6B21A8'}`,
                }}>
                  <div className="dash-card-mini-header" style={{ background: templateColors[resume.templateId] || '#6B21A8' }} />
                  <div className="dash-card-mini-lines">
                    <div className="dash-mini-line" style={{ width: '70%' }} />
                    <div className="dash-mini-line" style={{ width: '50%' }} />
                    <div className="dash-mini-line" style={{ width: '85%' }} />
                    <div className="dash-mini-line" style={{ width: '60%' }} />
                  </div>
                </div>

                <div className="dash-card-body">
                  <h3 className="dash-card-title">{resume.name || 'Untitled'}</h3>
                  <p className="dash-card-date">
                    Updated {formatDate(resume.updatedAt)}
                  </p>

                  <div className="dash-card-meta">
                    <span className="dash-card-template">{resume.templateId || 'classic'}</span>
                  </div>
                </div>

                <div className="dash-card-actions">
                  <Link to={`/builder/contact`} className="btn btn-sm btn-primary" style={{ flex: 1 }}>
                    ✏️ Edit
                  </Link>
                  <button className="btn-icon" onClick={() => handleDuplicate(resume.id)} title="Duplicate">
                    📋
                  </button>
                  <button className="btn-icon" onClick={() => handleExport(resume.id)} title="Export JSON">
                    📥
                  </button>
                  <button className="btn-icon" onClick={() => setConfirmDelete(resume.id)} title="Delete"
                    style={{ color: 'var(--color-error)' }}>
                    🗑️
                  </button>
                </div>

                {/* Delete Confirm Overlay */}
                {confirmDelete === resume.id && (
                  <div className="dash-card-confirm">
                    <p>Delete this resume?</p>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className="btn btn-sm" style={{ background: 'var(--color-error)', color: 'white' }}
                        onClick={() => handleDelete(resume.id)}>
                        Delete
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
