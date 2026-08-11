import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['p', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a', 'br', 'span', 'h1', 'h2', 'h3', 'h4', 's', 'del'];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];

export function sanitizeHTML(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
  });
}

export function sanitizeText(text) {
  if (!text) return '';
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

export function sanitizeURL(url) {
  if (!url) return '';
  const cleaned = sanitizeText(url).trim();
  if (cleaned.startsWith('javascript:') || cleaned.startsWith('data:')) {
    return '';
  }
  return cleaned;
}

export function isValidURL(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function isValidEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= 254;
}

export function isValidPhone(phone) {
  if (!phone) return true; // optional
  const re = /^\+?[\d\s\-()]{7,20}$/;
  return re.test(phone);
}

export function isValidDate(dateStr) {
  if (!dateStr) return true; // optional
  const re = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!re.test(dateStr)) return false;
  const parts = dateStr.split('/');
  const date = new Date(parts[2], parts[1] - 1, parts[0]);
  return date instanceof Date && !isNaN(date);
}
