import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';
import './RichTextEditor.css';

const MenuBar = ({ editor }) => {
  if (!editor) return null;

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
          •≡
        </button>
        <button
          type="button"
          className={`rte-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          1.
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
        >
          🔗
        </button>
        <button
          type="button"
          className="rte-btn"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Clear Formatting"
        >
          ⌧
        </button>
      </div>

      <div className="rte-toolbar-group" style={{ marginLeft: 'auto' }}>
        <button
          type="button"
          className="rte-btn undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          ↩
        </button>
        <button
          type="button"
          className="rte-btn redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          ↪
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
  showEnhanceBtn = false,
}) {
  const [showAIModal, setShowAIModal] = useState(false);
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
        style: `min-height: ${minHeight}px`,
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
          <button className="rte-enhance-btn" type="button" onClick={() => setShowAIModal(true)}>
            ✦ Enhance with AI
          </button>
        </div>
      )}
      <EditorContent editor={editor} />

      {/* AI Modal Overlay */}
      {showAIModal && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255, 255, 255, 0.95)', zIndex: 10,
          display: 'flex', flexDirection: 'column', padding: 'var(--space-6)',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)' }}>Expert recommendations</h3>
            <button onClick={() => setShowAIModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
            Personalized from your experience. You can edit these in the next step.
          </p>
          <div style={{ background: 'var(--color-surface-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', flex: 1, marginBottom: 'var(--space-4)' }}>
            <ul style={{ paddingLeft: 'var(--space-4)', margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <li>Developed scalable applications using modern technologies to enhance system performance.</li>
              <li>Collaborated with cross-functional teams to design user-friendly interfaces.</li>
              <li>Implemented automated testing frameworks, improving code quality.</li>
              <li>Optimized database queries, resulting in faster data retrieval.</li>
            </ul>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setShowAIModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-link)', fontWeight: 600, cursor: 'pointer' }}>No thanks</button>
            <button onClick={() => {
              const text = `<ul>
                <li>Developed scalable applications using modern technologies to enhance system performance.</li>
                <li>Collaborated with cross-functional teams to design user-friendly interfaces.</li>
                <li>Implemented automated testing frameworks, improving code quality.</li>
                <li>Optimized database queries, resulting in faster data retrieval.</li>
              </ul>`;
              editor.commands.setContent(text);
              setShowAIModal(false);
            }} className="btn btn-primary" style={{ background: '#D91277', border: 'none', borderRadius: 30, padding: '8px 24px' }}>
              Add recommendations
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
