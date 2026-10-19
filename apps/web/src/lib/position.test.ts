import { describe, expect, it } from 'vitest';
import { positionBetween } from './position';

describe('positionBetween', () => {
  it('goes halfway between two neighbours', () => {
    expect(positionBetween(1, 2)).toBe(1.5);
    expect(positionBetween(-3, -1)).toBe(-2);
  });

  it('steps past the neighbour at either end', () => {
    expect(positionBetween(undefined, 5)).toBe(4);
    expect(positionBetween(5, undefined)).toBe(6);
  });

  it('starts at 0 in an empty list', () => {
    expect(positionBetween()).toBe(0);
  });

  it('keeps finding room after many moves into the same gap', () => {
    // Halving 1.0 fifty times still leaves distinct, ordered numbers.
    let after = 2;
    for (let i = 0; i < 50; i++) {
      const next = positionBetween(1, after);
      expect(next).toBeGreaterThan(1);
      expect(next).toBeLessThan(after);
      after = next;
    }
  });
});
