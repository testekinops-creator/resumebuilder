import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const paths = {
  app: new URL('../src/App.jsx', import.meta.url),
  globalStyles: new URL('../src/index.css', import.meta.url),
  lock: new URL('../src/hooks/useGlobalModalScrollLock.js', import.meta.url),
  focus: new URL('../src/hooks/useDialogFocus.js', import.meta.url),
  popover: new URL('../src/hooks/useDismissiblePopover.js', import.meta.url),
  auth: new URL('../src/components/AuthModal.jsx', import.meta.url),
  email: new URL('../src/components/EmailResumeDialog.jsx', import.meta.url),
  viewer: new URL('../src/components/ResumePreviewViewer.jsx', import.meta.url),
  richText: new URL('../src/components/RichTextEditor.jsx', import.meta.url),
  richTextStyles: new URL('../src/components/RichTextEditor.css', import.meta.url),
  emptyStateDialog: new URL('../src/components/BuilderEmptyStateDialog.jsx', import.meta.url),
  customSections: new URL('../src/pages/builder/steps/CustomSectionsEditor.jsx', import.meta.url),
  builderStyles: new URL('../src/pages/builder/Builder.css', import.meta.url),
  builderLayout: new URL('../src/pages/builder/BuilderLayout.jsx', import.meta.url),
  upload: new URL('../src/pages/onboarding/UploadOrScratch.jsx', import.meta.url),
  editor: new URL('../src/pages/builder/FinalEditor.jsx', import.meta.url),
  editorStyles: new URL('../src/pages/builder/FinalEditor.css', import.meta.url),
  gallery: new URL('../src/pages/onboarding/TemplateGallery.jsx', import.meta.url),
  preview: new URL('../src/components/ResumePreview.jsx', import.meta.url),
  examples: new URL('../src/pages/examples/Examples.jsx', import.meta.url),
  examplesStyles: new URL('../src/pages/examples/Examples.css', import.meta.url),
  dashboardStyles: new URL('../src/pages/dashboard/Dashboard.css', import.meta.url),
  coverLetterStyles: new URL('../src/pages/coverletter/CoverLetter.css', import.meta.url),
};

async function sourceFiles() {
  const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await readFile(path, 'utf8')]));
  return Object.fromEntries(entries);
}

test('one app-level modal boundary protects scroll position across independently owned dialogs', async () => {
  const { app, lock, focus, popover, auth, email, viewer, editor, globalStyles } = await sourceFiles();

  assert.match(app, /useGlobalModalScrollLock\(\)/);
  assert.match(lock, /'\[aria-modal="true"\]'/);
  assert.match(lock, /new MutationObserver\(sync\)/);
  assert.match(lock, /const scrollX = window\.scrollX/);
  assert.match(lock, /const scrollY = window\.scrollY/);
  assert.match(lock, /body\.style\.position = 'fixed'/);
  assert.match(lock, /body\.style\.top = `-\$\{scrollY\}px`/);
  assert.match(lock, /body\.dataset\.modalScrollLock = 'true'/);
  assert.match(lock, /window\.scrollTo\(lockState\.scrollX, lockState\.scrollY\)/);
  assert.match(globalStyles, /body\[data-modal-scroll-lock\]/);
  assert.match(globalStyles, /max-height: calc\(100svh/);
  assert.match(globalStyles, /max-height: calc\(100dvh/);

  for (const component of [auth, email, viewer]) {
    assert.match(component, /useDialogFocus\(/);
    assert.doesNotMatch(component, /document\.body\.style\.overflow/);
  }
  assert.match(focus, /event\.key === 'Escape'/);
  assert.match(focus, /event\.key !== 'Tab'/);
  assert.match(focus, /previousFocusRef\.current\?\.focus\?\.\(\{ preventScroll: true \}\)/);
  assert.match(editor, /useDialogFocus\(mobileActionsDialogRef/);
  assert.match(editor, /useDialogFocus\(pendingDownloadDialogRef/);
  assert.match(editor, /useDialogFocus\(renameDialogRef/);
  assert.match(editor, /useDialogFocus\(welcomeDialogRef/);
  assert.match(editor, /<section ref=\{welcomeDialogRef\}[\s\S]*aria-modal="true"/);
  assert.match(editor, /function SectionReorderDialog[\s\S]*useDialogFocus\(dialogRef/);
  assert.match(editor, /useDismissiblePopover\(\{/);
  assert.match(editor, /aria-haspopup="menu" aria-expanded=\{showMenu\}/);
  assert.match(editor, /role="menuitem"/);
  assert.match(popover, /document\.addEventListener\('pointerdown', onPointerDown\)/);
  assert.match(popover, /event\.key !== 'Escape'/);
  assert.match(popover, /triggerRef\.current\?\.focus/);
});

test('touch drag and mobile Finalize retain native scrolling below the navigation layer', async () => {
  const { editor, editorStyles } = await sourceFiles();

  assert.match(editor, /useSensor\(MouseSensor, \{ activationConstraint: \{ distance: 6 \} \}\)/);
  assert.match(editor, /useSensor\(TouchSensor, \{ activationConstraint: \{ delay: 180, tolerance: 8 \} \}\)/);
  assert.match(editor, /className="fe-drag-handle"[\s\S]*\{\.\.\.listeners\}/);
  assert.match(editor, /<DragOverlay zIndex=\{10\}/);
  assert.match(editorStyles, /\.fe-drag-handle \{[\s\S]*touch-action: none/);
  assert.match(editorStyles, /\.fe-sortable-item \{[\s\S]*touch-action: pan-y/);
  assert.match(editorStyles, /\.fe-tool-tabs \{[\s\S]*z-index: 20/);
  assert.match(editorStyles, /\.fe-sortable-item\.is-dragging \{[\s\S]*z-index: 10/);
  assert.match(editorStyles, /@media \(max-width: 900px\), \(pointer: coarse\) \{[\s\S]*\.fe-section-move-btn,[\s\S]*width: 44px/);
  assert.match(editorStyles, /\.fe-template-filter,[\s\S]*\.fe-check-issue-list button \{[\s\S]*min-height: 44px/);
  assert.match(editor, /\{isMobileFinalize && \(\s*<section className="fe-mobile-summary"/);
  assert.match(editor, /\{!isMobileFinalize && <main className="fe-main">/);
});

test('mobile rendering avoids work that is off-screen or unrelated to the active resume edit', async () => {
  const { editor, gallery, preview } = await sourceFiles();

  assert.match(editor, /useDeferredValue\(qualityState\)/);
  assert.match(editor, /const loadExportTools = \(\) => import\('\.\.\/\.\.\/utils\/pdfGenerator'\)/);
  assert.match(editor, /const EmailResumeDialog = lazy\(\(\) => import\('\.\.\/\.\.\/components\/EmailResumeDialog'\)\)/);
  assert.doesNotMatch(editor, /import \{[^}]*generateDOCX[^}]*\} from '\.\.\/\.\.\/utils\/pdfGenerator'/);
  assert.match(editor, /\{isPrintDocumentMounted && <PrintableResume state=\{state\} \/>\}/);
  assert.match(editor, /const FinalizeTemplateThumbnail = memo\(/);
  assert.match(editor, /new IntersectionObserver\([\s\S]*rootMargin: '480px 0px'/);
  assert.match(editor, /thumbnail\s*\n\s*className="fe-template-thumbnail"/);
  assert.match(gallery, /const TemplateCard = memo\(/);
  assert.match(gallery, /new IntersectionObserver/);
  assert.match(gallery, /rootMargin: '640px 0px'/);
  assert.match(gallery, /<ResumePreview[\s\S]*data=\{TEMPLATE_PREVIEW_DATA\}/);
  assert.match(preview, /if \(data\) return <ResumePreviewRender/);
  assert.match(preview, /function ConnectedResumePreview/);
  assert.match(preview, /thumbnail = false/);
  assert.match(preview, /if \(thumbnail\) return undefined;/);
});

test('editor and builder confirmations use real modal boundaries, while inline confirmations do not lock the page', async () => {
  const { richText, richTextStyles, emptyStateDialog, customSections, builderStyles, builderLayout, upload } = await sourceFiles();

  assert.match(richText, /useDialogFocus\(aiDialogRef/);
  assert.match(richText, /className="rte-ai-backdrop" role="presentation"/);
  assert.match(richText, /<section ref=\{aiDialogRef\} className="rte-ai-overlay" role="dialog" aria-modal="true"/);
  assert.match(richTextStyles, /\.rte-ai-backdrop \{[\s\S]*position: fixed/);
  assert.match(richTextStyles, /\.rte-ai-overlay \{[\s\S]*100svh[\s\S]*100dvh/);
  assert.match(richTextStyles, /\.rte-toolbar \{[\s\S]*overflow-x: auto/);
  assert.match(richTextStyles, /@media \(max-width: 900px\), \(pointer: coarse\) \{[\s\S]*\.rte-btn \{[\s\S]*width: 44px/);
  assert.match(richTextStyles, /@media \(max-width: 900px\) \{[\s\S]*\.rte-content \{[\s\S]*max-height: none[\s\S]*overflow: visible/);
  assert.match(richTextStyles, /\.ProseMirror\.rte-content \{[\s\S]*min-height: var\(--rte-min-height/);
  assert.match(emptyStateDialog, /useDialogFocus\(dialogRef/);
  assert.match(emptyStateDialog, /<section[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(emptyStateDialog, /onMouseDown=\{onContinue\}/);
  assert.match(customSections, /useDialogFocus\(removeDialogRef/);
  assert.match(customSections, /ref=\{removeDialogRef\}[\s\S]*aria-modal="true"/);
  assert.match(builderStyles, /\.custom-section-remove-dialog \{[\s\S]*100svh[\s\S]*100dvh[\s\S]*overflow-y: auto/);
  assert.match(builderStyles, /\.custom-section-remove-btn \{[\s\S]*width: 44px/);
  assert.match(upload, /className="upload-replace-confirmation" role="region"/);
  assert.doesNotMatch(upload, /upload-replace-confirmation" role="dialog" aria-modal/);
  assert.match(builderLayout, /const showDesktopPreview = useMediaQuery\('\(min-width: 1181px\)'\)/);
  assert.match(builderLayout, /const showLayoutPreviewTrigger = !showDesktopPreview && location\.pathname === '\/builder\/smart-apply'/);
  assert.match(builderLayout, /\{showDesktopPreview && \(\s*<aside className="builder-preview"/);
  assert.match(builderStyles, /@media \(max-width: 1180px\) \{[\s\S]*\.builder-content \{[\s\S]*overflow-y: visible/);
  assert.match(builderStyles, /\.builder-suggestions \{[\s\S]*overflow-y: auto/);
  assert.match(builderStyles, /@media \(max-width: 900px\) \{[\s\S]*\.builder-suggestions \{[\s\S]*overflow-y: visible/);
});

test('secondary routes inherit viewport-safe pages and the shared preview-dialog behavior', async () => {
  const { examples, examplesStyles, dashboardStyles, coverLetterStyles } = await sourceFiles();

  assert.match(examples, /useDialogFocus\(dialogRef/);
  assert.match(examples, /<section[\s\S]*className="example-modal"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(examples, /aria-labelledby=\{titleId\}/);
  assert.match(examples, /aria-describedby=\{descriptionId\}/);
  assert.match(examples, /ref=\{closeRef\}[\s\S]*type="button"/);
  assert.match(examplesStyles, /\.examples-page \{[\s\S]*min-height: 100svh;[\s\S]*min-height: 100dvh/);
  assert.match(examplesStyles, /\.example-modal-backdrop \{[\s\S]*var\(--safe-area-top\)[\s\S]*var\(--safe-area-bottom\)[\s\S]*overscroll-behavior: contain/);
  assert.match(examplesStyles, /\.example-modal \{[\s\S]*100svh[\s\S]*100dvh[\s\S]*-webkit-overflow-scrolling: touch/);
  assert.match(examplesStyles, /\.example-modal-close \{[\s\S]*width: 44px;[\s\S]*height: 44px/);
  assert.match(examplesStyles, /@media \(max-width: 768px\), \(prefers-reduced-motion: reduce\) \{[\s\S]*backdrop-filter: none/);
  assert.match(dashboardStyles, /\.dashboard \{[\s\S]*min-height: 100svh;[\s\S]*min-height: 100dvh/);
  assert.match(coverLetterStyles, /\.cover-letter-page \{[\s\S]*min-height: 100svh;[\s\S]*min-height: 100dvh/);
  assert.match(coverLetterStyles, /\.cl-container \{[\s\S]*calc\(100svh - 56px\);[\s\S]*calc\(100dvh - 56px\)/);
});
