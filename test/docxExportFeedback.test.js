import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  DOCX_CONTENT_REQUIRED_ERROR, DOCX_CONTENT_REQUIRED_ERROR_TEXT,
  DOCX_DOWNLOAD_ERROR, DOCX_DOWNLOAD_ERROR_TEXT, DOCX_PREPARING_LABEL,
  docxExportFailureFeedback, docxExportFailureText, logDocxExportFailure,
} from '../src/utils/docxExportFeedback.js';

const editor = await readFile(new URL('../src/pages/builder/FinalEditor.jsx', import.meta.url), 'utf8');
const email = await readFile(new URL('../src/components/EmailResumeDialog.jsx', import.meta.url), 'utf8');

// Execute the production callback declarations with controlled async I/O. This
// verifies the real same-tick ref lock/finally paths without a copied handler or
// a browser-only JSX transform in the native Node test suite.
function callback(source, name, nextName, scope) {
  const start = source.indexOf(`  const ${name} =`);
  const end = source.indexOf(`  const ${nextName} =`, start);
  assert.ok(start >= 0 && end > start, `Missing callback ${name}`);
  return new Function(...Object.keys(scope), `${source.slice(start, end)}\nreturn ${name};`)(...Object.values(scope));
}

function editorScope(overrides = {}) {
  return {
    state: { meta: { id: 'current-resume', templateId: 'metro' }, design: { fontStyle: 'large' } },
    resumeName: 'Current resume', exportJobRef: { current: '' },
    setGenerating: () => {}, generateDOCX: async () => {}, generatePDF: async () => {},
    showNotification: () => {}, logDocxExportFailure: () => {}, docxExportFailureFeedback,
    console: { error: () => {} }, ...overrides,
  };
}

function emailScope(overrides = {}) {
  return {
    format: 'docx', state: { meta: { id: 'current-resume', templateId: 'metro' } }, resumeName: 'Current resume',
    operationRef: { current: '' }, mountedRef: { current: true }, prepareControllerRef: { current: null },
    setBusy: () => {}, setError: () => {}, setStatus: () => {}, setArtifact: () => {}, setDownloaded: () => {},
    prepareResumeExport: async () => ({ filename: 'Alex_Morgan_Resume.docx' }),
    logDocxExportFailure: () => {}, notifySafely: (notify, value) => notify(value), onNotify: () => {},
    docxExportFailureFeedback, docxExportFailureText, DOCX_PREPARING_LABEL,
    ...overrides,
  };
}

test('DOCX feedback uses the exact safe user-facing preparation and failure messages', () => {
  assert.equal(DOCX_PREPARING_LABEL, 'Preparing DOCX...');
  assert.equal(DOCX_DOWNLOAD_ERROR_TEXT, 'DOCX download failed. Your resume is still saved. Please try again.');
  assert.equal(DOCX_CONTENT_REQUIRED_ERROR_TEXT, 'Add resume details first. Add at least one resume detail before downloading a DOCX.');
});

test('DOCX validation feedback tells an empty resume how to recover without exposing renderer details', () => {
  const validation = Object.assign(new Error('Add at least one resume detail before downloading.'), { exportStage: 'validation' });
  assert.strictEqual(docxExportFailureFeedback(validation), DOCX_CONTENT_REQUIRED_ERROR);
  assert.equal(docxExportFailureText(validation), DOCX_CONTENT_REQUIRED_ERROR_TEXT);
  assert.strictEqual(docxExportFailureFeedback(Object.assign(new Error('Invalid table geometry'), { exportStage: 'layout' })), DOCX_DOWNLOAD_ERROR);
});

test('DOCX diagnostics are silent outside development and omit resume content', () => {
  const calls = [];
  const error = Object.assign(new Error('Invalid table geometry'), { exportStage: 'layout', status: 422 });
  const context = { templateId: 'metro', resumeId: 'resume-1', state: { summary: 'Private content' } };
  logDocxExportFailure(error, context, { development: false, logger: (...args) => calls.push(args) });
  assert.equal(calls.length, 0);
  logDocxExportFailure(error, context, { development: true, logger: (...args) => calls.push(args) });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1], { template: 'metro', resumeId: 'resume-1', stage: 'layout', status: 422, error: 'Invalid table geometry' });
  assert.doesNotThrow(() => logDocxExportFailure(error, context, { development: true, logger: () => { throw new Error('Logging unavailable'); } }));
});

test('Finalize locks same-tick DOCX double-clicks and passes current state without mutation', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const calls = [];
  const states = [];
  const scope = editorScope({ generateDOCX: async options => { calls.push(options); await pending; }, setGenerating: value => states.push(value) });
  const snapshot = structuredClone(scope.state);
  const download = callback(editor, 'performDownload', 'handleDownload', scope);
  const first = download('docx');
  await download('docx');
  await download('pdf');
  assert.equal(calls.length, 1);
  assert.equal(scope.exportJobRef.current, 'docx');
  assert.strictEqual(calls[0].state, scope.state);
  assert.equal(calls[0].resumeName, 'Current resume');
  assert.deepEqual(states, ['docx']);
  finish();
  await first;
  assert.equal(scope.exportJobRef.current, '');
  assert.deepEqual(states, ['docx', '']);
  assert.deepEqual(scope.state, snapshot);
  await download('docx');
  assert.equal(calls.length, 2);
});

test('Finalize DOCX errors restore the lock, preserve data, and expose only the safe message', async () => {
  const notifications = [];
  const diagnostics = [];
  const states = [];
  const scope = editorScope({
    generateDOCX: async () => { throw new Error('Internal renderer stack'); },
    showNotification: value => notifications.push(value), logDocxExportFailure: error => diagnostics.push(error),
    setGenerating: value => states.push(value),
  });
  const before = structuredClone(scope.state);
  await callback(editor, 'performDownload', 'handleDownload', scope)('docx');
  assert.deepEqual(notifications, [DOCX_DOWNLOAD_ERROR]);
  assert.equal(diagnostics.length, 1);
  assert.deepEqual(states, ['docx', '']);
  assert.equal(scope.exportJobRef.current, '');
  assert.deepEqual(scope.state, before);
});

test('Finalize surfaces a useful DOCX validation message for an empty resume', async () => {
  const notifications = [];
  const validation = Object.assign(new Error('Add at least one resume detail before downloading.'), { exportStage: 'validation' });
  const scope = editorScope({
    generateDOCX: async () => { throw validation; },
    showNotification: value => notifications.push(value),
  });
  await callback(editor, 'performDownload', 'handleDownload', scope)('docx');
  assert.deepEqual(notifications, [DOCX_CONTENT_REQUIRED_ERROR]);
});

test('Finalize PDF error behavior is unchanged and does not use DOCX feedback', async () => {
  const notifications = [];
  const logs = [];
  const scope = editorScope({
    generatePDF: async () => { throw new Error('Existing PDF error'); },
    showNotification: value => notifications.push(value),
    logDocxExportFailure: () => assert.fail('PDF must not use DOCX diagnostics'),
    console: { error: (...args) => logs.push(args) },
  });
  await callback(editor, 'performDownload', 'handleDownload', scope)('pdf');
  assert.deepEqual(notifications, [{ title: 'PDF download failed', message: "We couldn't generate your PDF. Your resume is still saved. Please try again." }]);
  assert.equal(logs[0][0], 'Resume export failed');
  assert.equal(scope.exportJobRef.current, '');
});

test('Email DOCX preparation is locked until completion and shows its format-specific loading text', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const statuses = [];
  const busy = [];
  const calls = [];
  const scope = emailScope({
    prepareResumeExport: async options => { calls.push(options); await pending; return { filename: 'Alex_Morgan_Resume.docx' }; },
    setStatus: value => statuses.push(value), setBusy: value => busy.push(value),
  });
  const prepare = callback(email, 'prepareFile', 'shareFile', scope);
  const first = prepare();
  await prepare();
  assert.equal(calls.length, 1);
  assert.strictEqual(calls[0].state, scope.state);
  assert.equal(calls[0].format, 'docx');
  assert.equal(statuses[0], DOCX_PREPARING_LABEL);
  assert.deepEqual(busy, ['prepare']);
  finish();
  await first;
  assert.equal(scope.operationRef.current, '');
  assert.equal(scope.prepareControllerRef.current, null);
  assert.deepEqual(busy, ['prepare', '']);
  assert.equal(statuses.at(-1), 'Alex_Morgan_Resume.docx is ready.');
});

test('Email DOCX preparation failures retain data and hide renderer details', async () => {
  const errors = [];
  const notifications = [];
  const scope = emailScope({
    prepareResumeExport: async () => { throw new Error('Internal XML problem'); },
    setError: value => errors.push(value), onNotify: value => notifications.push(value),
  });
  await callback(email, 'prepareFile', 'shareFile', scope)();
  assert.equal(errors.at(-1), DOCX_DOWNLOAD_ERROR_TEXT);
  assert.deepEqual(notifications, [{ type: 'error', ...DOCX_DOWNLOAD_ERROR }]);
  assert.equal(scope.operationRef.current, '');
  assert.equal(scope.state.meta.id, 'current-resume');
});

test('Email DOCX preparation tells an empty resume how to recover', async () => {
  const errors = [];
  const notifications = [];
  const validation = Object.assign(new Error('Add at least one resume detail before downloading.'), { exportStage: 'validation' });
  const scope = emailScope({
    prepareResumeExport: async () => { throw validation; },
    setError: value => errors.push(value), onNotify: value => notifications.push(value),
  });
  await callback(email, 'prepareFile', 'shareFile', scope)();
  assert.equal(errors.at(-1), DOCX_CONTENT_REQUIRED_ERROR_TEXT);
  assert.deepEqual(notifications, [{ type: 'error', ...DOCX_CONTENT_REQUIRED_ERROR }]);
});

test('Email ignores late DOCX preparation success or failure after the dialog closes', async () => {
  for (const outcome of ['success', 'failure']) {
    let finish;
    const pending = new Promise(resolve => { finish = resolve; });
    const events = [];
    const scope = emailScope({
      prepareResumeExport: async () => {
        await pending;
        if (outcome === 'failure') throw new Error('Late packing failure');
        return { filename: 'Alex_Morgan_Resume.docx' };
      },
      setBusy: value => events.push(['busy', value]),
      setError: value => events.push(['error', value]),
      setStatus: value => events.push(['status', value]),
      setArtifact: value => events.push(['artifact', value]),
      setDownloaded: value => events.push(['downloaded', value]),
      onNotify: value => events.push(['notification', value]),
      logDocxExportFailure: value => events.push(['diagnostic', value]),
    });
    const preparing = callback(email, 'prepareFile', 'shareFile', scope)();
    const beforeClosing = structuredClone(events);
    // Match the real effect cleanup: DOCX ZIP packing may finish despite abort,
    // so the mounted guard must suppress both late UI updates and error alerts.
    scope.mountedRef.current = false;
    scope.prepareControllerRef.current.abort();
    finish();
    await preparing;
    assert.deepEqual(events, beforeClosing, `${outcome}: no state updates or notifications after unmount`);
    assert.equal(scope.operationRef.current, '');
    assert.equal(scope.prepareControllerRef.current, null);
  }
});

test('Email format changes cannot replace an in-flight export and clear previously prepared artifacts when idle', () => {
  for (const nextFormat of ['docx', 'pdf']) {
    const changes = [];
    const scope = emailScope({
      operationRef: { current: 'prepare' },
      setFormat: value => changes.push(['format', value]),
      setArtifact: value => changes.push(['artifact', value]),
      setDownloaded: value => changes.push(['downloaded', value]),
      setStatus: value => changes.push(['status', value]),
      setError: value => changes.push(['error', value]),
    });
    const reset = callback(email, 'resetPreparedFile', 'prepareFile', scope);
    reset(nextFormat);
    assert.deepEqual(changes, [], 'a pending operation must retain its format and artifact');
    scope.operationRef.current = '';
    reset(nextFormat);
    assert.deepEqual(changes, [
      ['format', nextFormat], ['artifact', null], ['downloaded', false], ['status', ''], ['error', ''],
    ], 'switching PDF/DOCX must discard stale prepared files, download status, and feedback');
  }
});

test('Email PDF preparation retains its existing error and loading text', async () => {
  const errors = [];
  const statuses = [];
  const scope = emailScope({
    format: 'pdf', prepareResumeExport: async () => { throw new Error('Existing PDF error'); },
    setError: value => errors.push(value), setStatus: value => statuses.push(value),
    logDocxExportFailure: () => assert.fail('PDF must not use DOCX diagnostics'),
  });
  await callback(email, 'prepareFile', 'shareFile', scope)();
  assert.equal(statuses[0], 'Preparing PDF…');
  assert.equal(errors.at(-1), 'Existing PDF error');
});

test('Email DOCX download errors use the same safe feedback and restore the operation lock', () => {
  const errors = [];
  const notifications = [];
  const scope = emailScope({
    artifact: { format: 'docx', filename: 'Alex_Morgan_Resume.docx' },
    downloadResumeExport: () => { throw new Error('Internal download error'); },
    setError: value => errors.push(value), onNotify: value => notifications.push(value),
  });
  callback(email, 'downloadFile', 'openEmailApp', scope)();
  assert.equal(errors.at(-1), DOCX_DOWNLOAD_ERROR_TEXT);
  assert.deepEqual(notifications, [{ type: 'error', ...DOCX_DOWNLOAD_ERROR }]);
  assert.equal(scope.operationRef.current, '');
});

test('all Finalize DOCX entry points expose a disabled, busy loading state without hiding the mobile sheet', () => {
  const docxButtons = [...editor.matchAll(/<button\b[^>]*className="[^"]*fe-docx-button[^>]*>[\s\S]*?<\/button>/g)];
  assert.equal(docxButtons.length, 2);
  for (const [button] of docxButtons) {
    assert.match(button, /disabled=\{Boolean\(generating\)\}/);
    assert.match(button, /aria-busy=\{generating === 'docx'\}/);
    assert.match(button, /DOCX_PREPARING_LABEL/);
    assert.doesNotMatch(button, /setShowMobileActions\(false\)/);
  }
});
