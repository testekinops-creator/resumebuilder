import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useResume } from '../../../context/ResumeContext';
import { DEGREE_OPTIONS } from '../../../data/templates';
import StepNavigation from '../../../components/StepNavigation';
import MonthYearSelect from '../../../components/MonthYearSelect';
import BuilderEmptyStateDialog from '../../../components/BuilderEmptyStateDialog';

export default function EducationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state: resumeState, dispatch } = useResume();
  const editingEducation = resumeState.education.find(education => education.id === location.state?.educationId);
  const isEditing = Boolean(editingEducation);
  const [form, setForm] = useState({
    schoolName: '', location: '', degree: '',
    fieldOfStudy: '', graduationDate: '', coursework: '',
    ...editingEducation,
  });
  const [errors, setErrors] = useState({});
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const courseworkRef = useRef(null);

  useEffect(() => {
    const requestedField = location.state?.focusField || window.sessionStorage.getItem('resumeBuilder_focusQualityField');
    if (requestedField !== `education-coursework-${editingEducation?.id || 'current'}`) return;
    window.sessionStorage.removeItem('resumeBuilder_focusQualityField');
    courseworkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => courseworkRef.current?.focus(), 250);
  }, [editingEducation?.id, location.state?.focusField]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.schoolName.trim()) newErrors.schoolName = 'School name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!form.schoolName.trim()) {
      setShowEmptyModal(true);
      return false;
    }
    if (!validate()) return false;
    dispatch({
      type: isEditing ? 'UPDATE_EDUCATION' : 'ADD_EDUCATION',
      payload: isEditing ? { ...form, id: editingEducation.id } : form,
    });
    if (location.state?.returnTo) {
      navigate(location.state.returnTo, { state: { focusSection: location.state.focusSection } });
    } else {
      navigate('/builder/education-summary');
    }
    return false;
  };

  const handleSkip = () => {
    navigate('/builder/skills-intro');
  };

  return (
    <div className="step-page">
      <h1>{isEditing ? 'Edit your education' : 'Tell us about your education'}</h1>
      <p className="step-subtitle">Enter the details of your most recent or most relevant education.</p>

      <div className="step-form">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="schoolName">School Name<span className="required">*</span></label>
            <input id="schoolName" className={`form-input ${errors.schoolName ? 'error' : ''}`}
              type="text" placeholder="e.g. University of Mumbai"
              value={form.schoolName} onChange={e => handleChange('schoolName', e.target.value)} maxLength={200} />
            {errors.schoolName && <span className="form-error">{errors.schoolName}</span>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="schoolLocation">School Location</label>
            <input id="schoolLocation" className="form-input" type="text" placeholder="e.g. Mumbai, India"
              value={form.location} onChange={e => handleChange('location', e.target.value)} maxLength={200} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="degree">Degree</label>
            <select id="degree" className="form-input form-select"
              value={form.degree} onChange={e => handleChange('degree', e.target.value)}>
              <option value="">Select degree</option>
              {DEGREE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="fieldOfStudy">Field of Study</label>
            <input id="fieldOfStudy" className="form-input" type="text" placeholder="e.g. Computer Science"
              value={form.fieldOfStudy} onChange={e => handleChange('fieldOfStudy', e.target.value)} maxLength={200} />
          </div>
        </div>

        <div className="form-group" style={{ maxWidth: 300 }}>
          <label className="form-label" htmlFor="graduationDate">Graduation Date</label>
          <MonthYearSelect id="graduationDate" 
            value={form.graduationDate} onChange={val => handleChange('graduationDate', val)} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="coursework">Relevant Coursework (optional)</label>
          <textarea id="coursework" ref={courseworkRef} className="form-input" rows={3} spellCheck="true"
            placeholder="e.g. Data Structures, Algorithms, Web Development"
            value={form.coursework} onChange={e => handleChange('coursework', e.target.value)} maxLength={1000} />
        </div>
      </div>

      <StepNavigation
        backPath={isEditing ? '/builder/education-summary' : '/builder/education-level'}
        nextPath="/builder/education-summary"
        nextLabel="Next"
        onNext={handleNext}
      />

      {/* Empty State Modal */}
      {showEmptyModal && (
        <BuilderEmptyStateDialog
          title="Don't forget to include your educational background"
          description="Employers want to know about your degrees, certifications, and relevant coursework."
          continueLabel="Add education"
          onContinue={() => setShowEmptyModal(false)}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}
