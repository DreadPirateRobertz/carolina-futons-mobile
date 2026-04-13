/**
 * TDD tests for sanitizeText utility — cm-sec-hardening.
 *
 * Covers:
 *  - Strips <script> blocks with content
 *  - Strips <style> blocks with content
 *  - Strips arbitrary HTML tags (img, div, a, etc.)
 *  - Strips nested/malformed tags
 *  - XSS vectors: onerror, onload, javascript: URIs, event handlers
 *  - Preserves plain text content
 *  - Trims whitespace
 *  - Handles empty/null-like input
 *  - Returns empty string for tags-only input
 *
 * @bead cm-sec-hardening
 */

import { sanitizeText } from '../sanitizeText';

describe('sanitizeText', () => {
  // ── Script/style block stripping ──────────────────────────────────────────

  it('strips <script> blocks including content', () => {
    expect(sanitizeText('Hello<script>alert("xss")</script>World')).toBe('HelloWorld');
  });

  it('strips <script> blocks case-insensitively', () => {
    expect(sanitizeText('A<SCRIPT>evil()</SCRIPT>B')).toBe('AB');
  });

  it('strips <style> blocks including content', () => {
    expect(sanitizeText('text<style>body{display:none}</style>more')).toBe('textmore');
  });

  it('strips multiple script blocks', () => {
    expect(sanitizeText('<script>a()</script>safe<script>b()</script>')).toBe('safe');
  });

  // ── HTML tag stripping ────────────────────────────────────────────────────

  it('strips <img> tags', () => {
    expect(sanitizeText('Click <img src=x onerror=alert(1)> here')).toBe('Click  here');
  });

  it('strips <a> tags but preserves link text', () => {
    expect(sanitizeText('Visit <a href="evil.com">this link</a> now')).toBe('Visit this link now');
  });

  it('strips <div>, <span>, <p> tags but preserves text', () => {
    expect(sanitizeText('<div><span>Hello</span></div>')).toBe('Hello');
  });

  it('strips <iframe> tags', () => {
    expect(sanitizeText('before<iframe src="evil.com"></iframe>after')).toBe('beforeafter');
  });

  it('strips self-closing tags', () => {
    expect(sanitizeText('line<br/>break')).toBe('linebreak');
  });

  // ── XSS vectors ──────────────────────────────────────────────────────────

  it('strips event handler attributes via tag removal', () => {
    expect(sanitizeText('<div onmouseover="steal()">hover</div>')).toBe('hover');
  });

  it('strips javascript: URI in tags', () => {
    expect(sanitizeText('<a href="javascript:alert(1)">click</a>')).toBe('click');
  });

  it('strips SVG-based XSS', () => {
    expect(sanitizeText('<svg onload="alert(1)"></svg>safe')).toBe('safe');
  });

  it('strips nested/malformed tags aggressively', () => {
    // Regex strips all angle-bracket pairs — safer to over-strip than under-strip
    const result = sanitizeText('<<script>script>alert(1)<</script>/script>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
  });

  // ── Preserves safe content ────────────────────────────────────────────────

  it('preserves plain text unchanged', () => {
    expect(sanitizeText('Hello world')).toBe('Hello world');
  });

  it('preserves text with angle-bracket-like content that is not a tag', () => {
    expect(sanitizeText('5 > 3 and 2 < 4')).toBe('5 > 3 and 2 < 4');
  });

  it('preserves unicode characters', () => {
    expect(sanitizeText('Café résumé naïve')).toBe('Café résumé naïve');
  });

  it('preserves ampersands and special chars', () => {
    expect(sanitizeText('Tom & Jerry @ home')).toBe('Tom & Jerry @ home');
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(sanitizeText('   ')).toBe('');
  });

  it('returns empty string when input is only HTML tags', () => {
    expect(sanitizeText('<div></div><span></span>')).toBe('');
  });

  it('handles very long input without throwing', () => {
    const long = 'a'.repeat(10_000) + '<script>x</script>' + 'b'.repeat(10_000);
    const result = sanitizeText(long);
    expect(result.length).toBe(20_000);
  });
});
