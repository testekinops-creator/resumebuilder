import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResume } from '../../../context/ResumeContext';
import StepNavigation from '../../../components/StepNavigation';
import MonthYearSelect from '../../../components/MonthYearSelect';
import BuilderEmptyStateDialog from '../../../components/BuilderEmptyStateDialog';

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
        <BuilderEmptyStateDialog
          title="Don't forget to include other work experience"
          description="You can add internships, professional licenses, volunteer work and unpaid jobs."
          continueLabel="Add experience"
          onContinue={() => setShowEmptyModal(false)}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}
