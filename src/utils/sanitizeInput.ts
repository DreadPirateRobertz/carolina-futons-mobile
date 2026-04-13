/**
 * @module sanitizeInput
 *
 * Hardened user-input sanitizer for forms, search queries, reviews, comments.
 * Strips XSS vectors (HTML/script/style), defangs common SQL injection
 * signatures, trims whitespace, and optionally truncates.
 *
 * For legacy caption/QA content that only needs tag stripping, use `sanitizeText`.
 */

import { sanitizeText } from './sanitizeText';

const SQL_KEYWORD_COMBOS =
  /\b(DROP|DELETE|TRUNCATE|ALTER|EXEC|UNION|INSERT|UPDATE|CREATE)\s+(TABLE|FROM|INTO|DATABASE|SELECT|VIEW|INDEX)\b/gi;

export function sanitizeInput(value: string | null | undefined, maxLength?: number): string {
  if (value == null) return '';

  let raw: string;
  if (typeof value === 'string') {
    raw = value;
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    raw = String(value);
  } else {
    return '';
  }

  let clean = sanitizeText(raw)
    .replace(SQL_KEYWORD_COMBOS, '')
    .replace(/--+/g, '')
    .replace(/['";]{2,}/g, '')
    .trim();

  if (maxLength !== undefined) clean = clean.slice(0, maxLength);
  return clean;
}
