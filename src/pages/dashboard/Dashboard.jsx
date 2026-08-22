import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listResumes, deleteResumeById, duplicateResume, loadResumeById, exportResumeJSON } from '../../utils/storage';
import { useResume } from '../../context/ResumeContext';
import { TEMPLATES } from '../../data/templates';
import Navbar from '../../components/Navbar';
import ResumeIcon from '../../components/ResumeIcon';
import './Dashboard.css';

export default function Dashboard() {
  const [resumes, setResumes] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const navigate = useNavigate();
  const { dispatch } = useResume();

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
    dispatch({ type: 'RESET' });
    navigate('/get-started');
  };

  const handleEdit = (id) => {
    const data = loadResumeById(id);
    if (!data) return;
    dispatch({ type: 'LOAD_STATE', payload: data });
    navigate('/builder/contact');
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTemplateColor = (templateId) => (
    TEMPLATES.find(template => template.id === templateId)?.defaultColor || '#6B21A8'
  );

  return (
    <div className="dashboard">
      <Navbar />

      {/* Main Content */}
      <main className="dash-main">
        <div className="dash-hero">
          <h1>My Resumes</h1>
          <p>Manage all your resumes in one place. Create, edit, duplicate, or export.</p>
        </div>

        {resumes.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon"><ResumeIcon name="document" size={40} /></div>
            <h2>No resumes yet</h2>
            <p>Create your first professional resume in minutes.</p>
            <button className="btn btn-primary" onClick={handleNewResume}>
              <ResumeIcon name="add" size={18} />Create My First Resume
            </button>
          </div>
        ) : (
          <div className="dash-grid">
            {/* New Resume Card */}
            <div className="dash-card dash-card-new" onClick={handleNewResume}>
              <div className="dash-card-new-icon"><ResumeIcon name="add" size={28} /></div>
              <span>New Resume</span>
            </div>

            {/* Resume Cards */}
            {resumes.map(resume => (
              <div key={resume.id} className="dash-card">
                <div className="dash-card-preview" style={{
                  background: `linear-gradient(135deg, ${getTemplateColor(resume.templateId)}22, ${getTemplateColor(resume.templateId)}44)`,
                  borderTop: `4px solid ${getTemplateColor(resume.templateId)}`,
                }}>
                  <div className="dash-card-mini-header" style={{ background: getTemplateColor(resume.templateId) }} />
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
                  <button className="btn btn-sm btn-primary" onClick={() => handleEdit(resume.id)} style={{ flex: 1 }}>
                    <ResumeIcon name="edit" size={17} />Edit
                  </button>
                  <button className="btn-icon" onClick={() => handleDuplicate(resume.id)} title="Duplicate" aria-label="Duplicate resume">
                    <ResumeIcon name="template" size={18} />
                  </button>
                  <button className="btn-icon" onClick={() => handleExport(resume.id)} title="Export JSON" aria-label="Export JSON">
                    <ResumeIcon name="download" size={18} />
                  </button>
                  <button className="btn-icon" onClick={() => setConfirmDelete(resume.id)} title="Delete"
                    style={{ color: 'var(--color-error)' }}>
                    <ResumeIcon name="delete" size={18} />
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
