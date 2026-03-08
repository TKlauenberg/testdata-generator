import { describe, expect, test } from 'bun:test';
import { parseContextReferenceExpression } from './contextReference';

describe('parseContextReferenceExpression', () => {
  test('parses tag filters between collection and selector', () => {
    const result = parseContextReferenceExpression(
      '@context.users@Staging AND @REGION-us.random.email',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.collection).toBe('users');
      expect(result.value.tags).toEqual(['staging', 'region-us']);
      expect(result.value.selector).toEqual({ kind: 'random' });
      expect(result.value.fieldPath).toEqual(['email']);
    }
  });

  test('rejects OR syntax with an actionable error', () => {
    const result = parseContextReferenceExpression(
      '@context.users@staging OR @region-us.random.email',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/AND logic only/i);
    }
  });
});