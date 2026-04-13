import { sanitizeInput } from '../sanitizeInput';

describe('sanitizeInput', () => {
  describe('XSS / HTML', () => {
    it('strips script tags with content', () => {
      expect(sanitizeInput('<script>alert(1)</script>hello')).toBe('hello');
    });

    it('strips style tags with content', () => {
      expect(sanitizeInput('a<style>body{}</style>b')).toBe('ab');
    });

    it('strips generic html tags', () => {
      expect(sanitizeInput('<b>bold</b>')).toBe('bold');
    });

    it('strips mixed-case script tags', () => {
      expect(sanitizeInput('x<ScRiPt>evil()</ScRiPt>y')).toBe('xy');
    });

    it('strips img tags (common XSS vector)', () => {
      expect(sanitizeInput('<img src=x onerror=alert(1)>safe')).toBe('safe');
    });

    it('strips iframe tags', () => {
      expect(sanitizeInput('<iframe src="evil.com"></iframe>ok')).toBe('ok');
    });
  });

  describe('SQL injection patterns', () => {
    it('rejects classic DROP TABLE injection', () => {
      expect(sanitizeInput("'; DROP TABLE users; --")).not.toContain('DROP TABLE');
    });

    it('rejects UNION SELECT injection', () => {
      const result = sanitizeInput("1' UNION SELECT * FROM secrets--");
      expect(result).not.toContain('UNION SELECT');
    });

    it('rejects DELETE FROM injection', () => {
      expect(sanitizeInput("x'; DELETE FROM orders;")).not.toContain('DELETE FROM');
    });

    it('strips SQL comment markers', () => {
      expect(sanitizeInput('safe text -- dropped')).not.toContain('--');
    });

    it('strips runs of quote/semicolon injection boilerplate', () => {
      const result = sanitizeInput(`name'';;`);
      expect(result).not.toMatch(/['";]{2,}/);
    });
  });

  describe('normal text passthrough', () => {
    it('allows normal product review text unchanged', () => {
      expect(sanitizeInput('Nice sofa! 5 stars.')).toBe('Nice sofa! 5 stars.');
    });

    it('allows apostrophes in everyday words', () => {
      expect(sanitizeInput("It's comfy")).toBe("It's comfy");
    });

    it('allows numerals, punctuation, emoji', () => {
      expect(sanitizeInput('Got it on 4/12 for $499 — worth it 👍')).toBe(
        'Got it on 4/12 for $499 — worth it 👍',
      );
    });

    it('preserves internal whitespace', () => {
      expect(sanitizeInput('hello  world')).toBe('hello  world');
    });
  });

  describe('whitespace and boundary handling', () => {
    it('trims leading whitespace', () => {
      expect(sanitizeInput('   hello')).toBe('hello');
    });

    it('trims trailing whitespace', () => {
      expect(sanitizeInput('hello   ')).toBe('hello');
    });

    it('trims both sides', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('returns empty string for null', () => {
      expect(sanitizeInput(null as unknown as string)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(sanitizeInput(undefined as unknown as string)).toBe('');
    });

    it('returns empty string for empty input', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(sanitizeInput('     ')).toBe('');
    });

    it('handles very long input without throwing', () => {
      const long = 'a'.repeat(100_000);
      expect(() => sanitizeInput(long)).not.toThrow();
      expect(sanitizeInput(long)).toHaveLength(100_000);
    });
  });

  describe('maxLength truncation', () => {
    it('truncates to maxLength when provided', () => {
      expect(sanitizeInput('hello world', 5)).toBe('hello');
    });

    it('does not truncate when input is under maxLength', () => {
      expect(sanitizeInput('hi', 10)).toBe('hi');
    });

    it('maxLength of 0 returns empty string', () => {
      expect(sanitizeInput('hello', 0)).toBe('');
    });

    it('truncates AFTER sanitization (not before)', () => {
      // raw input with tags is 20 chars; real content after strip is "hello world" (11)
      expect(sanitizeInput('<b>hello world</b>', 5)).toBe('hello');
    });
  });

  describe('non-string defensive input', () => {
    it('coerces number to string', () => {
      expect(sanitizeInput(42 as unknown as string)).toBe('42');
    });

    it('returns empty string for objects', () => {
      expect(sanitizeInput({} as unknown as string)).toBe('');
    });
  });
});
