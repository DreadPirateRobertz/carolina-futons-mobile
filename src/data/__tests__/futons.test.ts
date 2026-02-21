import { FUTON_MODELS, FABRICS, inchesToFeetDisplay } from '../futons';

describe('Futon data', () => {
  it('has at least 3 futon models', () => {
    expect(FUTON_MODELS.length).toBeGreaterThanOrEqual(3);
  });

  it('each model has required fields', () => {
    for (const model of FUTON_MODELS) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.basePrice).toBeGreaterThan(0);
      expect(model.dimensions.width).toBeGreaterThan(0);
      expect(model.dimensions.depth).toBeGreaterThan(0);
      expect(model.dimensions.height).toBeGreaterThan(0);
      expect(model.dimensions.seatHeight).toBeGreaterThan(0);
      expect(model.fabrics.length).toBeGreaterThan(0);
    }
  });

  it('has at least 5 fabric options', () => {
    expect(FABRICS.length).toBeGreaterThanOrEqual(5);
  });

  it('each fabric has a valid hex color', () => {
    for (const fabric of FABRICS) {
      expect(fabric.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('inchesToFeetDisplay', () => {
  it('converts inches-only values', () => {
    expect(inchesToFeetDisplay(6)).toBe('6"');
  });

  it('converts exact feet', () => {
    expect(inchesToFeetDisplay(24)).toBe("2'");
    expect(inchesToFeetDisplay(36)).toBe("3'");
  });

  it('converts feet and inches', () => {
    expect(inchesToFeetDisplay(54)).toBe("4'6\"");
    expect(inchesToFeetDisplay(33)).toBe("2'9\"");
  });
});
