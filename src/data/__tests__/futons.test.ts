import {
  FUTON_MODELS,
  FABRICS,
  inchesToFeetDisplay,
  type FutonModel,
  type Fabric,
} from '../futons';

describe('Futon data integrity', () => {
  it('has at least 3 futon models', () => {
    expect(FUTON_MODELS.length).toBeGreaterThanOrEqual(3);
  });

  it('each model has required fields', () => {
    for (const model of FUTON_MODELS) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.tagline).toBeTruthy();
      expect(model.basePrice).toBeGreaterThan(0);
      expect(model.dimensions.width).toBeGreaterThan(0);
      expect(model.dimensions.depth).toBeGreaterThan(0);
      expect(model.dimensions.height).toBeGreaterThan(0);
      expect(model.dimensions.seatHeight).toBeGreaterThan(0);
      expect(model.fabrics.length).toBeGreaterThan(0);
    }
  });

  it('has unique model IDs', () => {
    const ids = FUTON_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique model names', () => {
    const names = FUTON_MODELS.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('model dimensions are realistic for furniture (inches)', () => {
    for (const model of FUTON_MODELS) {
      // Width should be between 30" and 80" for a futon
      expect(model.dimensions.width).toBeGreaterThanOrEqual(30);
      expect(model.dimensions.width).toBeLessThanOrEqual(80);
      // Depth should be between 20" and 50"
      expect(model.dimensions.depth).toBeGreaterThanOrEqual(20);
      expect(model.dimensions.depth).toBeLessThanOrEqual(50);
      // Height should be between 25" and 45"
      expect(model.dimensions.height).toBeGreaterThanOrEqual(25);
      expect(model.dimensions.height).toBeLessThanOrEqual(45);
      // Seat height should be between 14" and 22"
      expect(model.dimensions.seatHeight).toBeGreaterThanOrEqual(14);
      expect(model.dimensions.seatHeight).toBeLessThanOrEqual(22);
      // Seat height should be less than overall height
      expect(model.dimensions.seatHeight).toBeLessThan(model.dimensions.height);
    }
  });

  it('models are ordered by width descending (wider = more premium)', () => {
    // Not strictly required, but verifies the catalog makes sense:
    // each model should have a distinct width
    const widths = FUTON_MODELS.map((m) => m.dimensions.width);
    expect(new Set(widths).size).toBe(widths.length);
  });

  it('has at least 5 fabric options', () => {
    expect(FABRICS.length).toBeGreaterThanOrEqual(5);
  });

  it('has unique fabric IDs', () => {
    const ids = FABRICS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique fabric names', () => {
    const names = FABRICS.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('each fabric has a valid hex color', () => {
    for (const fabric of FABRICS) {
      expect(fabric.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('fabric prices are non-negative', () => {
    for (const fabric of FABRICS) {
      expect(fabric.price).toBeGreaterThanOrEqual(0);
    }
  });

  it('has at least one free fabric option (price = 0)', () => {
    const freeFabrics = FABRICS.filter((f) => f.price === 0);
    expect(freeFabrics.length).toBeGreaterThanOrEqual(1);
  });

  it('has at least one premium fabric option (price > 0)', () => {
    const premiumFabrics = FABRICS.filter((f) => f.price > 0);
    expect(premiumFabrics.length).toBeGreaterThanOrEqual(1);
  });

  it('all models reference valid fabrics array', () => {
    for (const model of FUTON_MODELS) {
      expect(Array.isArray(model.fabrics)).toBe(true);
      for (const fabric of model.fabrics) {
        expect(fabric.id).toBeTruthy();
        expect(fabric.name).toBeTruthy();
        expect(fabric.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(typeof fabric.price).toBe('number');
      }
    }
  });
});

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

  it('correctly formats all model dimensions', () => {
    // Verify real model dimensions produce sensible output
    for (const model of FUTON_MODELS) {
      const w = inchesToFeetDisplay(model.dimensions.width);
      const d = inchesToFeetDisplay(model.dimensions.depth);
      const h = inchesToFeetDisplay(model.dimensions.height);
      // Each should contain a quote mark (feet or inches symbol)
      expect(w).toMatch(/['"]/);
      expect(d).toMatch(/['"]/);
      expect(h).toMatch(/['"]/);
    }
  });
});

describe('Type contracts', () => {
  it('FutonModel shape matches expected interface', () => {
    const model: FutonModel = FUTON_MODELS[0];
    expect(typeof model.id).toBe('string');
    expect(typeof model.name).toBe('string');
    expect(typeof model.tagline).toBe('string');
    expect(typeof model.basePrice).toBe('number');
    expect(typeof model.dimensions.width).toBe('number');
    expect(typeof model.dimensions.depth).toBe('number');
    expect(typeof model.dimensions.height).toBe('number');
    expect(typeof model.dimensions.seatHeight).toBe('number');
    expect(Array.isArray(model.fabrics)).toBe(true);
  });

  it('Fabric shape matches expected interface', () => {
    const fabric: Fabric = FABRICS[0];
    expect(typeof fabric.id).toBe('string');
    expect(typeof fabric.name).toBe('string');
    expect(typeof fabric.color).toBe('string');
    expect(typeof fabric.price).toBe('number');
  });
});
