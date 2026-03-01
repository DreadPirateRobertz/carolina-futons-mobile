import { inchesToFeetDisplay } from '@/utils/dimensions';

describe('inchesToFeetDisplay', () => {
  it('converts inches-only values (< 12)', () => {
    expect(inchesToFeetDisplay(6)).toBe('6"');
    expect(inchesToFeetDisplay(1)).toBe('1"');
    expect(inchesToFeetDisplay(11)).toBe('11"');
  });

  it('handles zero inches', () => {
    expect(inchesToFeetDisplay(0)).toBe('0"');
  });

  it('converts exact feet (no remainder)', () => {
    expect(inchesToFeetDisplay(12)).toBe("1'");
    expect(inchesToFeetDisplay(24)).toBe("2'");
    expect(inchesToFeetDisplay(36)).toBe("3'");
    expect(inchesToFeetDisplay(60)).toBe("5'");
  });

  it('converts feet and inches', () => {
    expect(inchesToFeetDisplay(13)).toBe('1\'1"');
    expect(inchesToFeetDisplay(18)).toBe('1\'6"');
    expect(inchesToFeetDisplay(33)).toBe('2\'9"');
    expect(inchesToFeetDisplay(54)).toBe('4\'6"');
  });
});
