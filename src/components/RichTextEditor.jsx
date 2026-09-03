import { useEditor, EditorContent } from '@tiptap/react';
import { Extension, mergeAttributes, Node } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useState } from 'react';
import ResumeIcon from './ResumeIcon';
import { addToPersonalDictionary, analyzeTextQuality } from '../utils/resumeQuality';
import { useDialogFocus } from '../hooks/useDialogFocus';
import {
  convertSelectionToList,
  normalizePastedPlainText,
  normalizePastedSlice,
} from '../utils/richTextListNormalization';
import './RichTextEditor.css';

const DEFAULT_AI_RECOMMENDATIONS = [
  'Developed scalable applications using modern technologies to enhance system performance.',
  'Collaborated with cross-functional teams to design user-friendly interfaces.',
  'Implemented automated testing frameworks, improving code quality.',
  'Optimized database queries, resulting in faster data retrieval.',
];

const QUALITY_PLUGIN_KEY = new PluginKey('resumeQualityHighlights');

const QualityHighlights = Extension.create({
  name: 'resumeQualityHighlights',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: QUALITY_PLUGIN_KEY,
      state: {
        init: () => DecorationSet.empty,
        apply(transaction, decorations) {
          const next = transaction.getMeta(QUALITY_PLUGIN_KEY);
          return next || decorations.map(transaction.mapping, transaction.doc);
        },
      },
      props: {
        decorations(editorState) { return QUALITY_PLUGIN_KEY.getState(editorState); },
      },
    })];
  },
});

function collectEditorQualityIssues(editor, fieldId, ignoredFingerprints, ignoredWords) {
  const issues = [];
  editor.state.doc.descendants((node, position) => {
    if (!node.isText || !node.text) return;
    const nodeIssues = analyzeTextQuality(node.text, {
      plainText: true,
      ignoredFingerprints,
      ignoredWords,
      field: { fieldId, fieldPath: `${fieldId || 'rich-text'}:${position}` },
    });
    nodeIssues.forEach(issue => issues.push({ ...issue, from: position + issue.start, to: position + issue.end }));
  });
  return issues;
}

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
          onClick={() => convertSelectionToList(editor, 'bullet')}
          title="Bullet List"
        >
          <ResumeIcon name="sections" size={18} />
        </button>
        <button
          type="button"
          className={`rte-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          onClick={() => convertSelectionToList(editor, 'ordered')}
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
  fieldId = '',
  qualityEnabled = true,
  onQualityIssuesChange,
}) {
  const [internalAIModalOpen, setInternalAIModalOpen] = useState(false);
  const visibleAiSuggestions = aiSuggestions.filter(suggestion => String(suggestion || '').trim());
  const suggestionKey = visibleAiSuggestions.join('\u0001');
  const suggestionCount = suggestionKey ? suggestionKey.split('\u0001').length : 0;
  const isAIModalOpen = typeof aiModalOpen === 'boolean' ? aiModalOpen : internalAIModalOpen;
  const [selectedAiIndexes, setSelectedAiIndexes] = useState([]);
  const [qualityRevision, setQualityRevision] = useState(0);
  const [qualityIssues, setQualityIssues] = useState([]);
  const [activeQualityIssue, setActiveQualityIssue] = useState(null);
  const [ignoredFingerprints, setIgnoredFingerprints] = useState(() => new Set());
  const [ignoredWords, setIgnoredWords] = useState(() => new Set());
  const wrapperRef = useRef(null);
  const aiDialogRef = useRef(null);
  const aiCloseRef = useRef(null);

  const setAIModalOpen = (isOpen) => {
    if (typeof aiModalOpen !== 'boolean') setInternalAIModalOpen(isOpen);
    onAIModalOpenChange?.(isOpen);
  };

  useDialogFocus(aiDialogRef, {
    enabled: isAIModalOpen,
    onClose: () => setAIModalOpen(false),
    initialFocusRef: aiCloseRef,
  });

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
        // These are configured explicitly below so their resume-specific
        // behavior is registered exactly once in Tiptap 3.
        link: false,
        underline: false,
        // Keep inline marks when paragraphs are wrapped or switched between
        // bullet and numbered lists.
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      ResumeImage,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder }),
      QualityHighlights,
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
      setQualityRevision(revision => revision + 1);
    },
    editorProps: {
      transformPasted: normalizePastedSlice,
      transformPastedText: normalizePastedPlainText,
      attributes: {
        class: 'rte-content',
        style: `--rte-min-height: ${minHeight}px; --rte-max-height: ${maxHeight}px`,
        spellcheck: 'true',
        autocorrect: 'on',
        autocapitalize: 'sentences',
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor || !qualityEnabled) return undefined;
    const timer = window.setTimeout(() => {
      const issues = collectEditorQualityIssues(editor, fieldId, ignoredFingerprints, ignoredWords);
      const decorations = issues.map(issue => Decoration.inline(issue.from, issue.to, {
        class: `rte-quality-issue rte-quality-${issue.category}`,
        'data-quality-id': issue.fingerprint,
        'aria-label': issue.title,
      }));
      editor.view.dispatch(editor.state.tr.setMeta(QUALITY_PLUGIN_KEY, DecorationSet.create(editor.state.doc, decorations)));
      setQualityIssues(issues);
      onQualityIssuesChange?.(issues);
      setActiveQualityIssue(current => current && issues.find(issue => issue.fingerprint === current.fingerprint) || null);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [editor, fieldId, ignoredFingerprints, ignoredWords, onQualityIssuesChange, qualityEnabled, qualityRevision]);

  useEffect(() => {
    if (!editor || !fieldId) return;
    const requestedField = window.sessionStorage.getItem('resumeBuilder_focusQualityField');
    if (requestedField !== fieldId) return;
    window.sessionStorage.removeItem('resumeBuilder_focusQualityField');
    wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => editor.commands.focus('start'), 250);
  }, [editor, fieldId]);

  const replaceInlineIssue = (issue, replacement) => {
    if (!editor || !issue || typeof replacement !== 'string') return;
    editor.chain().focus().setTextSelection({ from: issue.from, to: issue.to }).insertContent(replacement).run();
    setActiveQualityIssue(null);
    setQualityRevision(revision => revision + 1);
  };

  const ignoreInlineIssue = (issue) => {
    setIgnoredFingerprints(current => new Set([...current, issue.fingerprint]));
    setActiveQualityIssue(null);
  };

  const ignoreInlineWord = (issue, persist = false) => {
    const word = String(issue?.original || '').toLocaleLowerCase();
    if (!word) return;
    if (persist) addToPersonalDictionary(word);
    setIgnoredWords(current => new Set([...current, word]));
    setActiveQualityIssue(null);
  };

  return (
    <div className="rte-wrapper" ref={wrapperRef} data-quality-field-id={fieldId || undefined} style={{ position: 'relative' }}>
      <MenuBar editor={editor} />
      {showEnhanceBtn && (
        <div className="rte-enhance-bar">
          <button className="rte-enhance-btn" type="button" onClick={() => setAIModalOpen(true)}>
            <ResumeIcon name="sparkle" size={16} />Enhance with AI
          </button>
        </div>
      )}
      <div
        className="rte-editor-surface"
        onClick={(event) => {
          const issueElement = event.target.closest?.('.rte-quality-issue');
          if (!issueElement) return;
          const issue = qualityIssues.find(item => item.fingerprint === issueElement.dataset.qualityId);
          if (issue) setActiveQualityIssue(issue);
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {activeQualityIssue && (
        <aside className="rte-quality-popover" role="dialog" aria-label="Writing suggestion">
          <div className="rte-quality-popover-heading">
            <div>
              <strong>{activeQualityIssue.title}</strong>
              <span>{activeQualityIssue.message}</span>
            </div>
            <button type="button" onClick={() => setActiveQualityIssue(null)} aria-label="Close writing suggestion"><ResumeIcon name="close" size={16} /></button>
          </div>
          {activeQualityIssue.suggestions.length > 0 && (
            <div className="rte-quality-suggestions" aria-label="Suggested replacements">
              {activeQualityIssue.suggestions.map(suggestion => (
                <button type="button" key={suggestion} onClick={() => replaceInlineIssue(activeQualityIssue, suggestion)}>{suggestion}</button>
              ))}
            </div>
          )}
          <div className="rte-quality-actions">
            <button type="button" onClick={() => ignoreInlineIssue(activeQualityIssue)}>Ignore once</button>
            {activeQualityIssue.category === 'spelling' && (
              <>
                <button type="button" onClick={() => ignoreInlineWord(activeQualityIssue)}>Ignore all</button>
                <button type="button" onClick={() => ignoreInlineWord(activeQualityIssue, true)}>Add to dictionary</button>
              </>
            )}
          </div>
        </aside>
      )}

      {/* AI Modal Overlay */}
      {isAIModalOpen && (
        <div className="rte-ai-backdrop" role="presentation" onMouseDown={() => setAIModalOpen(false)}>
          <section ref={aiDialogRef} className="rte-ai-overlay" role="dialog" aria-modal="true" aria-label={aiTitle} tabIndex={-1} onMouseDown={event => event.stopPropagation()}>
            <div className="rte-ai-header">
              <h3>{aiTitle}</h3>
              <button ref={aiCloseRef} type="button" onClick={() => setAIModalOpen(false)} aria-label="Close recommendations" title="Close recommendations"><ResumeIcon name="close" size={20} /></button>
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
          </section>
        </div>
      )}
    </div>
  );
}
