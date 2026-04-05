/**
 * @module sanitizeText
 *
 * Shared input sanitization utility — cm-sec-hardening.
 *
 * Strips HTML tags (including script/style block content) and trims.
 * Use on ALL user-submitted text before sending to APIs or rendering.
 *
 * This consolidates the sanitizeText/sanitizeCaption functions that were
 * previously duplicated in useProductQA, useQAAnswers, and useUGCPhotos.
 */

/**
 * Strip HTML tags (including script/style block content) and trim.
 * Returns plain text safe for API submission and rendering.
 */
export function sanitizeText(raw: string): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // strip script blocks + content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // strip style blocks + content
    .replace(/<[^>]*>/g, '') // strip remaining tags
    .trim();
}
