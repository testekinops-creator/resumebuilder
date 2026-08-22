import { useEditor, EditorContent } from '@tiptap/react';
import { mergeAttributes, Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';
import ResumeIcon from './ResumeIcon';
import './RichTextEditor.css';

const DEFAULT_AI_RECOMMENDATIONS = [
  'Developed scalable applications using modern technologies to enhance system performance.',
  'Collaborated with cross-functional teams to design user-friendly interfaces.',
  'Implemented automated testing frameworks, improving code quality.',
  'Optimized database queries, resulting in faster data retrieval.',
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const ResumeImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'img[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },
  addCommands() {
    return {
      setImage: options => ({ commands }) => commands.insertContent({ type: this.name, attrs: options }),
    };
  },
});

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  const addImage = () => {
    const value = window.prompt('Enter an image URL (https://...)');
    if (!value) return;

    try {
      const url = new URL(value.trim());
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
      editor.chain().focus().setImage({ src: url.href, alt: 'Resume image' }).run();
    } catch {
      window.alert('Please enter a valid http or https image URL.');
    }
  };

  return (
    <div className="rte-toolbar">
      <div className="rte-toolbar-group">
        <button
          type="button"
          className={`rte-btn ${editor.isActive('bold') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={`rte-btn ${editor.isActive('italic') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={`rte-btn ${editor.isActive('underline') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
      </div>

      <div className="rte-divider" />

      <div className="rte-toolbar-group">
        <button
          type="button"
          className={`rte-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <ResumeIcon name="sections" size={18} />
        </button>
        <button
          type="button"
          className={`rte-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ResumeIcon name="reorder" size={18} />
        </button>
      </div>

      <div className="rte-divider" />

      <div className="rte-toolbar-group">
        <button
          type="button"
          className="rte-btn"
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
            }
          }}
          title="Add Link"
          aria-label="Add link"
        >
          <ResumeIcon name="link" size={18} />
        </button>
        <button
          type="button"
          className="rte-btn"
          onClick={addImage}
          title="Add Image"
          aria-label="Add image"
        >
          <ResumeIcon name="image" size={18} />
        </button>
        <button
          type="button"
          className="rte-btn"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Clear Formatting"
          aria-label="Clear formatting"
        >
          <ResumeIcon name="clearFormat" size={18} />
        </button>
      </div>

      <div className="rte-toolbar-group rte-toolbar-actions">
        <button
          type="button"
          className="rte-btn undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
          aria-label="Undo"
        >
          <ResumeIcon name="undo" size={18} />
        </button>
        <button
          type="button"
          className="rte-btn redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
          aria-label="Redo"
        >
          <ResumeIcon name="redo" size={18} />
        </button>
      </div>
    </div>
  );
};

export default function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Start typing...',
  minHeight = 200,
  maxHeight = 480,
  showEnhanceBtn = false,
  aiSuggestions = DEFAULT_AI_RECOMMENDATIONS,
  aiTitle = 'Expert recommendations',
  aiDescription = 'Choose the suggestions you want to add. You can edit them at any time.',
  aiModalOpen,
  onAIModalOpenChange,
  onApplyRecommendations,
}) {
  const [internalAIModalOpen, setInternalAIModalOpen] = useState(false);
  const visibleAiSuggestions = aiSuggestions.filter(suggestion => String(suggestion || '').trim());
  const suggestionKey = visibleAiSuggestions.join('\u0001');
  const suggestionCount = suggestionKey ? suggestionKey.split('\u0001').length : 0;
  const isAIModalOpen = typeof aiModalOpen === 'boolean' ? aiModalOpen : internalAIModalOpen;
  const [selectedAiIndexes, setSelectedAiIndexes] = useState([]);

  const setAIModalOpen = (isOpen) => {
    if (typeof aiModalOpen !== 'boolean') setInternalAIModalOpen(isOpen);
    onAIModalOpenChange?.(isOpen);
  };

  useEffect(() => {
    if (isAIModalOpen) setSelectedAiIndexes(Array.from({ length: suggestionCount }, (_, index) => index));
  }, [isAIModalOpen, suggestionCount]);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      ResumeImage,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: 'rte-content',
        style: `min-height: ${minHeight}px; max-height: ${maxHeight}px`,
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  return (
    <div className="rte-wrapper" style={{ position: 'relative' }}>
      <MenuBar editor={editor} />
      {showEnhanceBtn && (
        <div className="rte-enhance-bar">
          <button className="rte-enhance-btn" type="button" onClick={() => setAIModalOpen(true)}>
            <ResumeIcon name="sparkle" size={16} />Enhance with AI
          </button>
        </div>
      )}
      <EditorContent editor={editor} />

      {/* AI Modal Overlay */}
      {isAIModalOpen && (
        <div className="rte-ai-overlay" role="dialog" aria-modal="true" aria-label={aiTitle}>
          <div className="rte-ai-header">
            <h3>{aiTitle}</h3>
            <button type="button" onClick={() => setAIModalOpen(false)} aria-label="Close recommendations" title="Close recommendations"><ResumeIcon name="close" size={20} /></button>
          </div>
          <p className="rte-ai-description">{aiDescription}</p>
          <div className="rte-ai-recommendations" tabIndex="0" aria-label="AI recommendations">
            <ul>
              {visibleAiSuggestions.map((suggestion, index) => (
                <li key={`${index}-${suggestion}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedAiIndexes.includes(index)}
                      onChange={() => setSelectedAiIndexes(current => current.includes(index)
                        ? current.filter(item => item !== index)
                        : [...current, index])}
                    />
                    <span>{suggestion}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="rte-ai-actions">
            <button type="button" className="rte-ai-cancel" onClick={() => setAIModalOpen(false)}>No thanks</button>
            <button
              type="button"
              className="btn btn-primary rte-ai-apply"
              disabled={!selectedAiIndexes.length || !editor}
              onClick={() => {
                const selectedSuggestions = visibleAiSuggestions.filter((_, index) => selectedAiIndexes.includes(index));
                const html = `<ul>${selectedSuggestions.map(suggestion => `<li>${escapeHtml(suggestion)}</li>`).join('')}</ul>`;
                if (onApplyRecommendations) onApplyRecommendations(html, selectedSuggestions);
                else editor.commands.setContent(html);
                setAIModalOpen(false);
              }}
            >
              Add {selectedAiIndexes.length || ''} recommendation{selectedAiIndexes.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
