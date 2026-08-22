import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RESUME_EXAMPLES, EXAMPLE_CATEGORIES } from '../../data/examples';
import { useResume } from '../../context/ResumeContext';
import Navbar from '../../components/Navbar';
import ResumeIcon from '../../components/ResumeIcon';
import './Examples.css';

export default function Examples() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedExample, setSelectedExample] = useState(null);
  const navigate = useNavigate();
  const { dispatch } = useResume();

  const filtered = activeCategory === 'All'
    ? RESUME_EXAMPLES
    : RESUME_EXAMPLES.filter(ex => ex.category === activeCategory);

  const handleUseTemplate = (example) => {
    const { data } = example;
    dispatch({ type: 'SET_CONTACT', payload: data.contact });
    dispatch({ type: 'SET_SUMMARY', payload: data.summary });
    data.workHistory.forEach(job => dispatch({ type: 'ADD_WORK', payload: job }));
    data.education.forEach(edu => dispatch({ type: 'ADD_EDUCATION', payload: edu }));
    if (data.skills) {
      dispatch({ type: 'SET_SKILLS', payload: data.skills });
    }
    navigate('/builder/contact');
  };

  return (
    <div className="examples-page">
      <Navbar />

      <div className="examples-hero">
        <h1>Resume Examples</h1>
        <p>Browse 8+ professionally written resume examples across industries. Use any as a starting template.</p>
      </div>

      <div className="examples-container">
        {/* Category Filter */}
        <div className="examples-filters">
          {EXAMPLE_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`examples-filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="examples-grid">
          {filtered.map(example => (
            <div key={example.id} className="example-card" onClick={() => setSelectedExample(example)}>
              <div className="example-card-icon"><ResumeIcon name="document" size={30} /></div>
              <h3 className="example-card-title">{example.title}</h3>
              <span className="example-card-category">{example.category}</span>
              <p className="example-card-summary">{example.summary}</p>
              <div className="example-card-skills">
                {example.data.skills.ratings.slice(0, 3).map(s => (
                  <span key={s.id} className="example-skill-tag">{s.name}</span>
                ))}
              </div>
              <button
                className="btn btn-primary btn-sm example-card-btn"
                onClick={(e) => { e.stopPropagation(); handleUseTemplate(example); }}
              >
                Use This Template
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {selectedExample && (
        <div className="example-modal-backdrop" onClick={() => setSelectedExample(null)}>
          <div className="example-modal" onClick={e => e.stopPropagation()}>
            <button className="example-modal-close" onClick={() => setSelectedExample(null)} aria-label="Close example preview" title="Close example preview"><ResumeIcon name="close" size={20} /></button>
            <div className="example-modal-header">
              <span className="example-modal-icon"><ResumeIcon name="document" size={30} /></span>
              <div>
                <h2>{selectedExample.title}</h2>
                <span className="example-card-category">{selectedExample.category}</span>
              </div>
            </div>

            <div className="example-modal-body">
              <div className="example-modal-section">
                <h4>Summary</h4>
                <div dangerouslySetInnerHTML={{ __html: selectedExample.data.summary.content }} />
              </div>

              <div className="example-modal-section">
                <h4>Work Experience</h4>
                {selectedExample.data.workHistory.map(job => (
                  <div key={job.id} className="example-modal-job">
                    <strong>{job.jobTitle}</strong> at {job.employer}
                    <div className="example-modal-job-desc" dangerouslySetInnerHTML={{ __html: job.description }} />
                  </div>
                ))}
              </div>

              <div className="example-modal-section">
                <h4>Skills</h4>
                <div className="example-card-skills">
                  {selectedExample.data.skills.ratings.map(s => (
                    <span key={s.id} className="example-skill-tag">{s.name}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="example-modal-footer">
              <button className="btn btn-primary" onClick={() => handleUseTemplate(selectedExample)}>
                Use This Template <ResumeIcon name="arrowLeft" size={16} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <button className="btn btn-ghost" onClick={() => setSelectedExample(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
