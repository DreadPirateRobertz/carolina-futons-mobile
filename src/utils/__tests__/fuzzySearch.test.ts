import { fuzzyScore, fuzzySearch, getSuggestions } from '../fuzzySearch';

describe('fuzzyScore', () => {
  it('returns 1.0 for exact match', () => {
    expect(fuzzyScore('futon', 'futon')).toBe(1.0);
  });

  it('is case-insensitive', () => {
    expect(fuzzyScore('FUTON', 'futon')).toBe(1.0);
    expect(fuzzyScore('Futon', 'FUTON')).toBe(1.0);
  });

  it('returns 0 for empty query', () => {
    expect(fuzzyScore('', 'futon')).toBe(0);
  });

  it('returns 0 for empty text', () => {
    expect(fuzzyScore('futon', '')).toBe(0);
  });

  it('returns high score for substring at start', () => {
    const score = fuzzyScore('ash', 'Asheville Full Futon');
    expect(score).toBeGreaterThanOrEqual(0.9);
  });

  it('returns high score for substring at word boundary', () => {
    const score = fuzzyScore('full', 'Asheville Full Futon');
    expect(score).toBeGreaterThanOrEqual(0.8);
  });

  it('returns good score for substring in middle', () => {
    const score = fuzzyScore('hev', 'Asheville Full Futon');
    expect(score).toBeGreaterThanOrEqual(0.8);
  });

  it('returns lower score for fuzzy character-sequence match', () => {
    const score = fuzzyScore('aftn', 'Asheville Full Futon');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.8);
  });

  it('returns 0 when characters not found in sequence', () => {
    expect(fuzzyScore('xyz', 'Asheville Full Futon')).toBe(0);
  });

  it('returns 0 when characters out of order', () => {
    expect(fuzzyScore('notuf', 'futon')).toBe(0);
  });

  it('handles single character queries', () => {
    const score = fuzzyScore('f', 'Futon');
    expect(score).toBeGreaterThan(0);
  });

  it('scores exact substring higher than fuzzy match', () => {
    const exactSub = fuzzyScore('full', 'Asheville Full Futon');
    const fuzzy = fuzzyScore('aftn', 'Asheville Full Futon');
    expect(exactSub).toBeGreaterThan(fuzzy);
  });

  it('scores start-of-string match higher than mid-string', () => {
    const startMatch = fuzzyScore('ash', 'Asheville Full Futon');
    const midMatch = fuzzyScore('full', 'Asheville Full Futon');
    expect(startMatch).toBeGreaterThanOrEqual(midMatch);
  });

  it('handles query with spaces', () => {
    const score = fuzzyScore('full futon', 'Asheville Full Futon');
    expect(score).toBeGreaterThan(0);
  });
});

describe('fuzzySearch', () => {
  const items = [
    { id: 1, name: 'The Asheville Full Futon', desc: 'Bestselling full-size futon' },
    { id: 2, name: 'Blue Ridge Queen Futon', desc: 'Premium queen futon frame' },
    { id: 3, name: 'Mountain View Pillow Set', desc: 'Soft decorative pillows' },
    { id: 4, name: 'Cedar Frame Full Size', desc: 'Solid wood futon frame' },
  ];

  const getText = (item: (typeof items)[number]) => [item.name, item.desc];

  it('returns all items when query is empty', () => {
    const results = fuzzySearch(items, '', getText);
    expect(results).toHaveLength(4);
  });

  it('finds items by name', () => {
    const results = fuzzySearch(items, 'asheville', getText);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.id).toBe(1);
  });

  it('finds items by description', () => {
    const results = fuzzySearch(items, 'decorative', getText);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.id).toBe(3);
  });

  it('returns results sorted by score descending', () => {
    const results = fuzzySearch(items, 'futon', getText);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });

  it('excludes items below threshold', () => {
    const results = fuzzySearch(items, 'xyznothing', getText);
    expect(results).toHaveLength(0);
  });

  it('each result includes item and score', () => {
    const results = fuzzySearch(items, 'full', getText);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('item');
    expect(results[0]).toHaveProperty('score');
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('respects custom threshold', () => {
    const looseResults = fuzzySearch(items, 'f', getText, 0.05);
    const strictResults = fuzzySearch(items, 'f', getText, 0.5);
    expect(looseResults.length).toBeGreaterThanOrEqual(strictResults.length);
  });
});

describe('getSuggestions', () => {
  const names = [
    'The Asheville Full Futon',
    'Blue Ridge Queen Futon',
    'Pisgah Twin Futon',
    'Mountain View Pillow Set',
    'Cedar Frame Full Size',
    'Biltmore Loveseat',
  ];

  it('returns empty for empty query', () => {
    expect(getSuggestions('', names)).toEqual([]);
  });

  it('returns matching product names', () => {
    const suggestions = getSuggestions('futon', names);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((s) => s.toLowerCase().includes('futon'))).toBe(true);
  });

  it('respects maxResults', () => {
    const suggestions = getSuggestions('f', names, 2);
    expect(suggestions.length).toBeLessThanOrEqual(2);
  });

  it('returns suggestions sorted by relevance', () => {
    const suggestions = getSuggestions('ash', names);
    expect(suggestions.length).toBeGreaterThan(0);
    // Asheville should be first (starts with 'ash')
    expect(suggestions[0]).toContain('Asheville');
  });

  it('handles partial matches', () => {
    const suggestions = getSuggestions('blu', names);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]).toContain('Blue Ridge');
  });

  it('returns empty for no matches', () => {
    expect(getSuggestions('xyznotfound', names)).toEqual([]);
  });
});
