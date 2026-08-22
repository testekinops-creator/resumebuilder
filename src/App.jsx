import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ResumeProvider } from './context/ResumeContext';
import './index.css';

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const HowItWorks = lazy(() => import('./pages/onboarding/HowItWorks'));
const ExperienceLevel = lazy(() => import('./pages/onboarding/ExperienceLevel'));
const TemplateGallery = lazy(() => import('./pages/onboarding/TemplateGallery'));
const UploadOrScratch = lazy(() => import('./pages/onboarding/UploadOrScratch'));
const BuilderLayout = lazy(() => import('./pages/builder/BuilderLayout'));
const ContactInfo = lazy(() => import('./pages/builder/steps/ContactInfo'));
const ResumePurpose = lazy(() => import('./pages/builder/steps/ResumePurpose'));
const WorkHistoryForm = lazy(() => import('./pages/builder/steps/WorkHistoryForm'));
const WorkHistoryEditor = lazy(() => import('./pages/builder/steps/WorkHistoryEditor'));
const WorkHistorySummary = lazy(() => import('./pages/builder/steps/WorkHistorySummary'));
const EducationIntro = lazy(() => import('./pages/builder/steps/EducationIntro'));
const EducationLevel = lazy(() => import('./pages/builder/steps/EducationLevel'));
const EducationForm = lazy(() => import('./pages/builder/steps/EducationForm'));
const EducationSummary = lazy(() => import('./pages/builder/steps/EducationSummary'));
const SkillsIntro = lazy(() => import('./pages/builder/steps/SkillsIntro'));
const SkillsEditor = lazy(() => import('./pages/builder/steps/SkillsEditor'));
const SummaryIntro = lazy(() => import('./pages/builder/steps/SummaryIntro'));
const SummaryEditor = lazy(() => import('./pages/builder/steps/SummaryEditor'));
const ExtraSections = lazy(() => import('./pages/builder/steps/ExtraSections'));
const PersonalDetails = lazy(() => import('./pages/builder/steps/PersonalDetails'));
const WebsitesProfiles = lazy(() => import('./pages/builder/steps/WebsitesProfiles'));
const CertificationsEditor = lazy(() => import('./pages/builder/steps/CertificationsEditor'));
const LanguagesForm = lazy(() => import('./pages/builder/steps/LanguagesForm'));
const CustomSectionsEditor = lazy(() => import('./pages/builder/steps/CustomSectionsEditor'));
const SmartApply = lazy(() => import('./pages/builder/steps/SmartApply'));
const FinalEditor = lazy(() => import('./pages/builder/FinalEditor'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Examples = lazy(() => import('./pages/examples/Examples'));
const CoverLetter = lazy(() => import('./pages/coverletter/CoverLetter'));
const CompareTemplates = lazy(() => import('./pages/compare/CompareTemplates'));
const CareerCenter = lazy(() => import('./pages/career/CareerCenter'));
const PdfExportPage = lazy(() => import('./pages/PdfExportPage'));

function LoadingFallback() {
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
    </div>
  );
}

function App() {
  return (
    <ResumeProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/get-started" element={<HowItWorks />} />
            <Route path="/experience-level" element={<ExperienceLevel />} />
            <Route path="/choose-template" element={<TemplateGallery />} />
            <Route path="/upload-resume" element={<UploadOrScratch />} />
            <Route path="/builder" element={<BuilderLayout />}>
              <Route path="contact" element={<ContactInfo />} />
              <Route path="purpose" element={<ResumePurpose />} />
              <Route path="work-history" element={<WorkHistoryForm />} />
              <Route path="work-editor" element={<WorkHistoryEditor />} />
              <Route path="work-summary" element={<WorkHistorySummary />} />
              <Route path="education-intro" element={<EducationIntro />} />
              <Route path="education-level" element={<EducationLevel />} />
              <Route path="education-form" element={<EducationForm />} />
              <Route path="education-summary" element={<EducationSummary />} />
              <Route path="skills-intro" element={<SkillsIntro />} />
              <Route path="skills-editor" element={<SkillsEditor />} />
              <Route path="summary-intro" element={<SummaryIntro />} />
              <Route path="summary-editor" element={<SummaryEditor />} />
              <Route path="extra-sections" element={<ExtraSections />} />
              <Route path="personal-details" element={<PersonalDetails />} />
              <Route path="websites" element={<WebsitesProfiles />} />
              <Route path="certifications" element={<CertificationsEditor />} />
              <Route path="languages" element={<LanguagesForm />} />
              <Route path="custom-sections" element={<CustomSectionsEditor />} />
              <Route path="smart-apply" element={<SmartApply />} />
            </Route>
            <Route path="/finalize" element={<FinalEditor />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/examples" element={<Examples />} />
            <Route path="/cover-letter" element={<CoverLetter />} />
            <Route path="/compare" element={<CompareTemplates />} />
            <Route path="/career" element={<CareerCenter />} />
            <Route path="/pdf-export" element={<PdfExportPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ResumeProvider>
  );
}

export default App;
