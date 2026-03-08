import type { Result } from '../common/result';
import type { RNG } from '../generator/rng';
import { normalizeContextTags } from './contextManager';
import { selectContextRecord } from './selector';
import type { ContextCollections, JsonValue } from './types';

export interface ContextReferenceRandomSelector {
  readonly kind: 'random';
}

export interface ContextReferenceIndexSelector {
  readonly kind: 'index';
  readonly index: number;
}

export type ContextReferenceSelector = ContextReferenceRandomSelector | ContextReferenceIndexSelector;

export interface ContextReferenceExpression {
  readonly raw: string;
  readonly collection: string;
  readonly tags: readonly string[];
  readonly selector: ContextReferenceSelector;
  readonly fieldPath: readonly string[];
}

const CONTEXT_PREFIX = '@context.';

export function isContextReferenceExpression(value: string): boolean {
  return value.startsWith(CONTEXT_PREFIX);
}

export function parseContextReferenceExpression(
  value: string,
): Result<ContextReferenceExpression, string[]> {
  if (!isContextReferenceExpression(value)) {
    return {
      ok: false,
      errors: [`'${value}' is not a context reference expression`],
    };
  }

  const rest = value.slice(CONTEXT_PREFIX.length);
  const collectionMatch = rest.match(/^([A-Za-z_][A-Za-z0-9_]*)(.*)$/);
  if (!collectionMatch) {
    return {
      ok: false,
      errors: [
        `Invalid context reference '${value}': expected collection name after '@context.'`,
      ],
    };
  }

  const collection = collectionMatch[1];
  let remaining = collectionMatch[2];

  const tagFilterResult = parseTagFilters(value, collection, remaining);
  if (!tagFilterResult.ok) {
    return tagFilterResult;
  }

  const tags = tagFilterResult.value.tags;
  remaining = tagFilterResult.value.remaining;

  let selector: ContextReferenceSelector | undefined;
  if (remaining.startsWith('.random')) {
    selector = { kind: 'random' };
    remaining = remaining.slice('.random'.length);
  } else {
    const indexMatch = remaining.match(/^\[(\d+)\](.*)$/);
    if (!indexMatch) {
      return {
        ok: false,
        errors: [
          tags.length > 0
            ? `Invalid context reference '${value}': expected '.random' or '[index]' after tag filters on collection '${collection}'`
            : `Invalid context reference '${value}': expected '.random' or '[index]' after collection '${collection}'`,
        ],
      };
    }

    selector = {
      kind: 'index',
      index: Number(indexMatch[1]),
    };
    remaining = indexMatch[2];
  }

  const fieldPath: string[] = [];
  if (remaining.length > 0) {
    if (!remaining.startsWith('.')) {
      return {
        ok: false,
        errors: [
          `Invalid context reference '${value}': only optional '.fieldName' suffix is supported`,
        ],
      };
    }

    const pathSource = remaining.slice(1);
    if (pathSource.length === 0) {
      return {
        ok: false,
        errors: [
          `Invalid context reference '${value}': field suffix cannot be empty`,
        ],
      };
    }

    for (const segment of pathSource.split('.')) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment)) {
        return {
          ok: false,
          errors: [
            `Invalid context reference '${value}': field segment '${segment}' must be an identifier`,
          ],
        };
      }
      fieldPath.push(segment);
    }
  }

  return {
    ok: true,
    value: {
      raw: value,
      collection,
      tags,
      selector,
      fieldPath,
    },
  };
}

function parseTagFilters(
  raw: string,
  collection: string,
  remaining: string,
): Result<{ readonly tags: readonly string[]; readonly remaining: string }, string[]> {
  const tags: string[] = [];
  let next = remaining;

  while (next.startsWith('@')) {
    const tagMatch = next.match(/^@([A-Za-z0-9_-]+)(.*)$/);
    if (!tagMatch) {
      return {
        ok: false,
        errors: [
          `Invalid context reference '${raw}': expected a tag name like '@staging' after collection '${collection}'`,
        ],
      };
    }

    const [normalizedTag] = normalizeContextTags([tagMatch[1]]);
    if (normalizedTag) {
      tags.push(normalizedTag);
    }

    next = tagMatch[2];
    const operatorMatch = next.match(/^\s+(AND|OR)\s+/i);
    if (operatorMatch) {
      const operator = operatorMatch[1].toUpperCase();
      next = next.slice(operatorMatch[0].length);

      if (operator === 'OR') {
        return {
          ok: false,
          errors: [
            `Invalid context reference '${raw}': tag filters support AND logic only; use '@tagOne AND @tagTwo'`,
          ],
        };
      }

      if (!next.startsWith('@')) {
        return {
          ok: false,
          errors: [
            `Invalid context reference '${raw}': expected '@tag' after 'AND'`,
          ],
        };
      }

      continue;
    }

    if (next.startsWith(' OR ')) {
      return {
        ok: false,
        errors: [
          `Invalid context reference '${raw}': tag filters support AND logic only; use '@tagOne AND @tagTwo'`,
        ],
      };
    }

    break;
  }

  return {
    ok: true,
    value: {
      tags,
      remaining: next,
    },
  };
}

function resolveFieldPath(expression: ContextReferenceExpression, selected: JsonValue): JsonValue {
  if (expression.fieldPath.length === 0) {
    return selected;
  }

  let current: JsonValue = selected;
  for (const segment of expression.fieldPath) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) {
      throw new Error(
        `Cannot resolve field path '${expression.fieldPath.join('.')}' in context reference '${expression.raw}'`,
      );
    }

    const next = (current as Record<string, JsonValue>)[segment];
    if (next === undefined) {
      throw new Error(
        `Field '${segment}' not found in context reference '${expression.raw}'`,
      );
    }
    current = next;
  }

  return current;
}

export function resolveContextReferenceExpression(
  expression: ContextReferenceExpression,
  contextCollections: ContextCollections,
  rng: RNG,
): JsonValue {
  const context = contextCollections[expression.collection];
  if (context === undefined) {
    throw new Error(
      `Context collection '${expression.collection}' is not available for reference '${expression.raw}'`,
    );
  }

  const selected = selectContextRecord(expression, context, rng);
  return resolveFieldPath(expression, selected);
}
