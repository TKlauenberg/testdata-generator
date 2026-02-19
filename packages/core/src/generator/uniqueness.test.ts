import { describe, it, expect } from 'bun:test';
import { UniquenessTracker } from './uniqueness';

describe('UniquenessTracker', () => {
  it('returns true for first-seen value and false for duplicates in same field', () => {
    const tracker = new UniquenessTracker();

    expect(tracker.track('email', 'ada@example.com')).toBe(true);
    expect(tracker.track('email', 'ada@example.com')).toBe(false);
  });

  it('tracks uniqueness per field independently', () => {
    const tracker = new UniquenessTracker();

    expect(tracker.track('email', 'shared')).toBe(true);
    expect(tracker.track('username', 'shared')).toBe(true);
    expect(tracker.track('email', 'shared')).toBe(false);
  });

  it('supports deterministic object-like value tracking', () => {
    const tracker = new UniquenessTracker();

    const first = { b: 2, a: 1 };
    const sameDifferentOrder = { a: 1, b: 2 };

    expect(tracker.track('profile', first)).toBe(true);
    expect(tracker.track('profile', sameDifferentOrder)).toBe(false);
  });

  it('supports composite uniqueness for 2-field combinations', () => {
    const tracker = new UniquenessTracker();

    expect(tracker.trackComposite(['firstName', 'lastName'], ['Ada', 'Lovelace'])).toBe(true);
    expect(tracker.trackComposite(['firstName', 'lastName'], ['Ada', 'Lovelace'])).toBe(false);
    expect(tracker.trackComposite(['firstName', 'lastName'], ['Grace', 'Hopper'])).toBe(true);
  });

  it('supports composite uniqueness for 3-field combinations', () => {
    const tracker = new UniquenessTracker();

    expect(tracker.trackComposite(['country', 'city', 'zip'], ['US', 'New York', '10001'])).toBe(true);
    expect(tracker.trackComposite(['country', 'city', 'zip'], ['US', 'New York', '10001'])).toBe(false);
    expect(tracker.trackComposite(['country', 'city', 'zip'], ['US', 'New York', '10002'])).toBe(true);
  });

  it('resets state with clear()', () => {
    const tracker = new UniquenessTracker();

    expect(tracker.track('id', 42)).toBe(true);
    expect(tracker.track('id', 42)).toBe(false);

    tracker.clear();

    expect(tracker.track('id', 42)).toBe(true);
  });

  it('maintains stable behavior at larger tracking volumes', () => {
    const tracker = new UniquenessTracker();

    for (let index = 0; index < 10000; index++) {
      expect(tracker.track('large-set', `value-${index}`)).toBe(true);
    }

    for (let index = 0; index < 10000; index++) {
      expect(tracker.track('large-set', `value-${index}`)).toBe(false);
    }
  });
});
