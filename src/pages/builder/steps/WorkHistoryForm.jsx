import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResume } from '../../../context/ResumeContext';
import StepNavigation from '../../../components/StepNavigation';
import MonthYearSelect from '../../../components/MonthYearSelect';
import ResumeIcon from '../../../components/ResumeIcon';

export default function WorkHistoryForm() {
  const navigate = useNavigate();
  const { dispatch } = useResume();
  const [form, setForm] = useState({
    jobTitle: '', employer: '', location: '',
    remote: false, startDate: '', endDate: '', currentJob: false,
  });
  const [errors, setErrors] = useState({});
  const [showEmptyModal, setShowEmptyModal] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.jobTitle.trim()) newErrors.jobTitle = 'Job title is required';
    if (!form.employer.trim()) newErrors.employer = 'Employer is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!form.jobTitle.trim() && !form.employer.trim()) {
      setShowEmptyModal(true);
      return false;
    }
    if (!validate()) return false;
    dispatch({ type: 'ADD_WORK', payload: form });
    navigate('/builder/work-editor');
    return false; // Prevent default navigation
  };

  const handleSkip = () => {
    navigate('/builder/education-intro');
  };

  return (
    <div className="step-page">
      <h1>Tell us about your most recent job</h1>
      <p className="step-subtitle">Start with your latest position. We'll walk you through the details.</p>

      <div className="step-form">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="jobTitle">Job Title<span className="required">*</span></label>
            <input id="jobTitle" className={`form-input ${errors.jobTitle ? 'error' : ''}`}
              type="text" placeholder="e.g. Manager"
              value={form.jobTitle} onChange={e => handleChange('jobTitle', e.target.value)} maxLength={100} />
            {errors.jobTitle && <span className="form-error">{errors.jobTitle}</span>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="employer">Employer<span className="required">*</span></label>
            <input id="employer" className={`form-input ${errors.employer ? 'error' : ''}`}
              type="text" placeholder="e.g. Acme Corp"
              value={form.employer} onChange={e => handleChange('employer', e.target.value)} maxLength={100} />
            {errors.employer && <span className="form-error">{errors.employer}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="location">Location</label>
            <input id="location" className="form-input" type="text" placeholder="e.g. Mumbai, India"
              value={form.location} onChange={e => handleChange('location', e.target.value)} maxLength={200} />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <label className="form-checkbox-group">
              <input type="checkbox" className="form-checkbox"
                checked={form.remote} onChange={e => handleChange('remote', e.target.checked)} />
              <span>Remote</span>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="startDate">Start Date</label>
            <MonthYearSelect id="startDate" 
              value={form.startDate} onChange={val => handleChange('startDate', val)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="endDate">End Date</label>
            <MonthYearSelect id="endDate" 
              value={form.endDate} onChange={val => handleChange('endDate', val)}
              disabled={form.currentJob} />
            <label className="form-checkbox-group" style={{ marginTop: 'var(--space-2)' }}>
              <input type="checkbox" className="form-checkbox"
                checked={form.currentJob} onChange={e => handleChange('currentJob', e.target.checked)} />
              <span style={{ fontSize: 'var(--font-size-sm)' }}>I currently work here</span>
            </label>
          </div>
        </div>
      </div>

      <StepNavigation
        backPath="/builder/purpose"
        nextPath="/builder/work-editor"
        nextLabel="Next"
        onNext={handleNext}
      />

      {/* Empty State Modal */}
      {showEmptyModal && (
        <div className="mobile-preview-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="mobile-preview-content" style={{ maxWidth: 400, width: '100%', padding: 'var(--space-6)', background: 'white', borderRadius: 'var(--radius-lg)', position: 'relative' }}>
            <button className="fe-close-btn" onClick={() => setShowEmptyModal(false)} aria-label="Close message" title="Close message" style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}><ResumeIcon name="close" size={22} /></button>
            
            <h3 style={{ fontSize: 20, marginBottom: 'var(--space-3)' }}>Don't forget to include other work experience</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
              You can add internships, professional licenses, volunteer work and unpaid jobs.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <button className="btn btn-primary" onClick={() => setShowEmptyModal(false)} style={{ borderRadius: 30, padding: '12px', background: '#D91277', border: 'none' }}>
                Add experience
              </button>
              <button className="btn btn-ghost" onClick={handleSkip} style={{ color: 'var(--color-text-link)', fontWeight: 600, textDecoration: 'underline' }}>
                No thanks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
