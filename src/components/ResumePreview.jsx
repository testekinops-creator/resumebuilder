import { useResume } from '../context/ResumeContext';
import ClassicTemplate from './templates/ClassicTemplate';
import ModernTemplate from './templates/ModernTemplate';
import ProfessionalTemplate from './templates/ProfessionalTemplate';
import CreativeTemplate from './templates/CreativeTemplate';
import MinimalTemplate from './templates/MinimalTemplate';
import ExecutiveTemplate from './templates/ExecutiveTemplate';
import './ResumePreview.css';

const TEMPLATE_MAP = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  professional: ProfessionalTemplate,
  creative: CreativeTemplate,
  minimal: MinimalTemplate,
  executive: ExecutiveTemplate,
};

export default function ResumePreview({ highlightSection = '', scale = 0.38 }) {
  const { state } = useResume();
  const { design } = state;
  const templateId = state.meta.templateId || 'classic';
  const themeColor = design.colorScheme || '#6B21A8';
  
  const fontSizeMap = { small: '10px', normal: '11px', large: '12px' };
  const fontSize = fontSizeMap[design.fontStyle] || '11px';
  const fontFamily = design.fontFamily || 'Inter, sans-serif';
  const spacing = `${Math.round(8 + (design.sectionSpacing / 100) * 16)}px`;

  const TemplateComponent = TEMPLATE_MAP[templateId] || ClassicTemplate;

  return (
    <div className="preview-container" style={{ '--preview-scale': scale }}>
      <div className="preview-page">
        <TemplateComponent 
          state={state} 
          themeColor={themeColor} 
          fontSize={fontSize} 
          fontFamily={fontFamily} 
          spacing={spacing} 
        />
      </div>
    </div>
  );
}
