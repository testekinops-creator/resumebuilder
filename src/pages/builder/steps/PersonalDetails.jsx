import { useResume } from '../../../context/ResumeContext';
import StepNavigation from '../../../components/StepNavigation';
import { getOptionalSectionPath } from '../../../utils/optionalSections';

export default function PersonalDetails() {
  const { state, dispatch } = useResume();
  const details = state.personalDetails;

  const handleChange = (field, value) => {
    dispatch({ type: 'SET_PERSONAL_DETAILS', payload: { [field]: value } });
  };

  const selected = state.extraSections.selected || [];

  return (
    <div className="step-page">
      <h1>Personal Details</h1>
      <p className="step-subtitle">
        These details are optional. Only include information that's relevant or required by the employer.
      </p>

      <div className="step-form">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="dob">Date of Birth</label>
            <input id="dob" className="form-input" type="date"
              value={details.dob} onChange={e => handleChange('dob', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="nationality">Nationality</label>
            <input id="nationality" className="form-input" type="text" placeholder="e.g. Indian"
              value={details.nationality} onChange={e => handleChange('nationality', e.target.value)} maxLength={100} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="maritalStatus">Marital Status</label>
            <select id="maritalStatus" className="form-input form-select"
              value={details.maritalStatus} onChange={e => handleChange('maritalStatus', e.target.value)}>
              <option value="">Select</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="visaStatus">Visa Status</label>
            <input id="visaStatus" className="form-input" type="text" placeholder="e.g. Work Permit"
              value={details.visaStatus} onChange={e => handleChange('visaStatus', e.target.value)} maxLength={100} />
          </div>
        </div>

        <div className="form-group" style={{ maxWidth: 300 }}>
          <label className="form-label" htmlFor="gender">Gender</label>
          <select id="gender" className="form-input form-select"
            value={details.gender} onChange={e => handleChange('gender', e.target.value)}>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>
      </div>

      <StepNavigation
        backPath={getOptionalSectionPath(selected, 'personalDetails', 'back')}
        nextPath={getOptionalSectionPath(selected, 'personalDetails')}
        nextLabel="Next"
      />
    </div>
  );
}
