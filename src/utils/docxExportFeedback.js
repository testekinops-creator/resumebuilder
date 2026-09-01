export const DOCX_PREPARING_LABEL = 'Preparing DOCX...';
export const DOCX_DOWNLOAD_ERROR = Object.freeze({
  title: 'DOCX download failed.',
  message: 'Your resume is still saved. Please try again.',
});
export const DOCX_DOWNLOAD_ERROR_TEXT = `${DOCX_DOWNLOAD_ERROR.title} ${DOCX_DOWNLOAD_ERROR.message}`;
export const DOCX_CONTENT_REQUIRED_ERROR = Object.freeze({
  title: 'Add resume details first.',
  message: 'Add at least one resume detail before downloading a DOCX.',
});
export const DOCX_CONTENT_REQUIRED_ERROR_TEXT = `${DOCX_CONTENT_REQUIRED_ERROR.title} ${DOCX_CONTENT_REQUIRED_ERROR.message}`;

/**
 * Map known, recoverable validation states to concise safe guidance without
 * exposing renderer internals. All other DOCX failures keep the generic retry
 * path because the user's saved resume is unaffected.
 */
export function docxExportFailureFeedback(error) {
  if (error?.exportStage === 'validation' && /at least one resume detail/i.test(String(error?.message || ''))) {
    return DOCX_CONTENT_REQUIRED_ERROR;
  }
  return DOCX_DOWNLOAD_ERROR;
}

export function docxExportFailureText(error) {
  const feedback = docxExportFailureFeedback(error);
  return `${feedback.title} ${feedback.message}`;
}

/** Keep document contents out of logs and technical errors out of production UI. */
export function logDocxExportFailure(error, context = {}, options = {}) {
  const development = options.development ?? (import.meta.env?.DEV === true);
  if (!development) return;
  const logger = options.logger || console.error;
  try {
    logger('DOCX export failed', {
      template: context.templateId,
      resumeId: context.resumeId,
      stage: error?.exportStage || context.stage || 'unknown',
      status: error?.status,
      error: error instanceof Error ? error.message : String(error),
    });
  } catch {
    // A diagnostic sink must not interrupt the recoverable download flow.
  }
}
