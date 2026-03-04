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

  it('distinguishes special numeric values during tracking', () => {
    const tracker = new UniquenessTracker();

    expect(tracker.track('metrics', NaN)).toBe(true);
    expect(tracker.track('metrics', NaN)).toBe(false);

    expect(tracker.track('metrics', Infinity)).toBe(true);
    expect(tracker.track('metrics', -Infinity)).toBe(true);
    expect(tracker.track('metrics', null)).toBe(true);

    expect(tracker.track('metrics', Infinity)).toBe(false);
    expect(tracker.track('metrics', -Infinity)).toBe(false);
  });

  it('avoids collisions for non-plain object values', () => {
    const tracker = new UniquenessTracker();

    expect(tracker.track('advanced', new Map([['a', 1]]))).toBe(true);
    expect(tracker.track('advanced', new Map([['a', 2]]))).toBe(true);
    expect(tracker.track('advanced', new Set(['x', 'y']))).toBe(true);
    expect(tracker.track('advanced', /abc/i)).toBe(true);
    expect(tracker.track('advanced', /abc/i)).toBe(false);
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

  it('rolls back composite values with untrackComposite()', () => {
    const tracker = new UniquenessTracker();

    expect(tracker.trackComposite(['email', 'tenantId'], ['ada@test.com', 'tenant-1'])).toBe(true);
    tracker.untrackComposite(['email', 'tenantId'], ['ada@test.com', 'tenant-1']);

    expect(tracker.trackComposite(['email', 'tenantId'], ['ada@test.com', 'tenant-1'])).toBe(true);
  });

  it('only rolls back the specific composite tuple for a signature', () => {
    const tracker = new UniquenessTracker();

    expect(tracker.trackComposite(['email', 'tenantId'], ['ada@test.com', 'tenant-1'])).toBe(true);
    expect(tracker.trackComposite(['email', 'tenantId'], ['ada@test.com', 'tenant-2'])).toBe(true);

    tracker.untrackComposite(['email', 'tenantId'], ['ada@test.com', 'tenant-1']);

    expect(tracker.trackComposite(['email', 'tenantId'], ['ada@test.com', 'tenant-1'])).toBe(true);
    expect(tracker.trackComposite(['email', 'tenantId'], ['ada@test.com', 'tenant-2'])).toBe(false);
  });

  it('rejects invalid composite tracking inputs', () => {
    const tracker = new UniquenessTracker();

    expect(tracker.trackComposite([], [])).toBe(false);
    expect(tracker.trackComposite(['a'], [])).toBe(false);
    expect(tracker.trackComposite(['a', 'b'], ['one'])).toBe(false);
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

  it('stays within a reasonable memory envelope for large tracking workloads', () => {
    const tracker = new UniquenessTracker();
    const before = process.memoryUsage().heapUsed;

    for (let index = 0; index < 50000; index++) {
      tracker.track('memory-check', `value-${index}`);
    }

    const afterInsert = process.memoryUsage().heapUsed;
    const growth = afterInsert - before;

    expect(growth).toBeLessThan(256 * 1024 * 1024);

    tracker.clear();

    expect(tracker.track('memory-check', 'value-0')).toBe(true);
  });
});
