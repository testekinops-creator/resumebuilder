import { useState } from 'react';
import { useResume } from '../../../context/ResumeContext';
import { isValidEmail, isValidPhone } from '../../../utils/sanitize';
import StepNavigation from '../../../components/StepNavigation';

export default function ContactInfo() {
  const { state, dispatch } = useResume();
  const [errors, setErrors] = useState({});
  const contact = state.contact;
  const [showLinks, setShowLinks] = useState({
    linkedIn: !!contact.linkedIn,
    website: !!contact.website,
    drivingLicence: !!contact.drivingLicence,
  });

  const handleChange = (field, value) => {
    dispatch({ type: 'SET_CONTACT', payload: { [field]: value } });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!contact.email) {
      newErrors.email = 'In order to proceed, you must enter a valid email address.';
    } else if (!isValidEmail(contact.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (contact.phone && !isValidPhone(contact.phone)) {
      newErrors.phone = 'Enter a valid phone number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="step-page">
      <h1>What's the best way for employers to contact you?</h1>
      <p className="step-subtitle">We suggest including an email and phone number.</p>

      <div className="step-form">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="firstName">First Name</label>
            <input id="firstName" className="form-input" type="text" placeholder="e.g. John"
              value={contact.firstName} onChange={e => handleChange('firstName', e.target.value)} maxLength={50} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="surname">Surname</label>
            <input id="surname" className="form-input" type="text" placeholder="e.g. Doe"
              value={contact.surname} onChange={e => handleChange('surname', e.target.value)} maxLength={50} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="city">City</label>
            <input id="city" className="form-input" type="text" placeholder="e.g. Mumbai"
              value={contact.city} onChange={e => handleChange('city', e.target.value)} maxLength={100} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="country">Country</label>
            <input id="country" className="form-input" type="text" placeholder="e.g. India"
              value={contact.country} onChange={e => handleChange('country', e.target.value)} maxLength={100} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pinCode">Pin Code</label>
          <input id="pinCode" className="form-input" type="text" placeholder="e.g. 400001"
            value={contact.pinCode} onChange={e => handleChange('pinCode', e.target.value)} maxLength={10}
            style={{ maxWidth: 200 }} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone</label>
            <div className="input-wrapper">
              <input id="phone" className={`form-input ${errors.phone ? 'error' : contact.phone ? 'success' : ''}`}
                type="tel" placeholder="e.g. +91 9876543210"
                value={contact.phone} onChange={e => handleChange('phone', e.target.value)} maxLength={20} />
              {contact.phone && !errors.phone && <span className="validation-icon valid">✓</span>}
            </div>
            {errors.phone && <span className="form-error">{errors.phone}</span>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email<span className="required">*</span></label>
            <div className="input-wrapper">
              <input id="email" className={`form-input ${errors.email ? 'error' : contact.email && isValidEmail(contact.email) ? 'success' : ''}`}
                type="email" placeholder="e.g. john@example.com"
                value={contact.email} onChange={e => handleChange('email', e.target.value)} maxLength={254} />
              {contact.email && isValidEmail(contact.email) && <span className="validation-icon valid">✓</span>}
            </div>
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>
        </div>

        {/* Optional links */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
          {!showLinks.linkedIn && (
            <button className="tag" onClick={() => setShowLinks(p => ({ ...p, linkedIn: true }))}>
              🔗 LinkedIn +
            </button>
          )}
          {!showLinks.website && (
            <button className="tag" onClick={() => setShowLinks(p => ({ ...p, website: true }))}>
              🌐 Website +
            </button>
          )}
          {!showLinks.drivingLicence && (
            <button className="tag" onClick={() => setShowLinks(p => ({ ...p, drivingLicence: true }))}>
              🚗 Driving Licence +
            </button>
          )}
        </div>

        {showLinks.linkedIn && (
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label" htmlFor="linkedIn">LinkedIn</label>
              <button className="fe-close-btn" onClick={() => { setShowLinks(p => ({ ...p, linkedIn: false })); handleChange('linkedIn', ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>✕</button>
            </div>
            <input id="linkedIn" className="form-input" type="url" placeholder="https://linkedin.com/in/yourname"
              value={contact.linkedIn} onChange={e => handleChange('linkedIn', e.target.value)} />
          </div>
        )}
        {showLinks.website && (
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label" htmlFor="website">Website</label>
              <button className="fe-close-btn" onClick={() => { setShowLinks(p => ({ ...p, website: false })); handleChange('website', ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>✕</button>
            </div>
            <input id="website" className="form-input" type="url" placeholder="https://yourwebsite.com"
              value={contact.website} onChange={e => handleChange('website', e.target.value)} />
          </div>
        )}
        {showLinks.drivingLicence && (
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label" htmlFor="drivingLicence">Driving Licence</label>
              <button className="fe-close-btn" onClick={() => { setShowLinks(p => ({ ...p, drivingLicence: false })); handleChange('drivingLicence', ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>✕</button>
            </div>
            <input id="drivingLicence" className="form-input" type="text" placeholder="e.g. Full UK Licence"
              value={contact.drivingLicence} onChange={e => handleChange('drivingLicence', e.target.value)} />
          </div>
        )}
      </div>

      <StepNavigation
        nextPath="/builder/purpose"
        nextLabel="Next: Work history"
        onNext={validate}
      />
    </div>
  );
}
