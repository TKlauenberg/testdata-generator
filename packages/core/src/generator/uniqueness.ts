type StableValue =
  | null
  | boolean
  | number
  | string
  | StableValue[]
  | { [key: string]: StableValue };

function normalizeForStableSerialization(value: unknown): StableValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return { __type: 'number', value: 'NaN' };
    }

    if (value === Infinity) {
      return { __type: 'number', value: 'Infinity' };
    }

    if (value === -Infinity) {
      return { __type: 'number', value: '-Infinity' };
    }

    if (Object.is(value, -0)) {
      return { __type: 'number', value: '-0' };
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForStableSerialization(item));
  }

  if (typeof value === 'bigint') {
    return { __type: 'bigint', value: value.toString() };
  }

  if (value === undefined) {
    return { __type: 'undefined' };
  }

  if (value instanceof Date) {
    return { __type: 'date', value: value.toISOString() };
  }

  if (value instanceof RegExp) {
    return { __type: 'regexp', source: value.source, flags: value.flags };
  }

  if (value instanceof Error) {
    return {
      __type: 'error',
      name: value.name,
      message: value.message,
    };
  }

  if (value instanceof Map) {
    const normalizedEntries = Array.from(value.entries()).map(([key, mapValue]) => {
      const normalizedKey = normalizeForStableSerialization(key);
      const normalizedValue = normalizeForStableSerialization(mapValue);
      return [normalizedKey, normalizedValue] as const;
    });

    normalizedEntries.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));

    return {
      __type: 'map',
      entries: normalizedEntries as unknown as StableValue[],
    };
  }

  if (value instanceof Set) {
    const normalizedValues = Array.from(value.values()).map((setValue) => normalizeForStableSerialization(setValue));
    normalizedValues.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));

    return {
      __type: 'set',
      values: normalizedValues,
    };
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sortedEntries = Object.keys(record)
      .sort()
      .map((key) => [key, normalizeForStableSerialization(record[key])] as const);

    return Object.fromEntries(sortedEntries);
  }

  if (typeof value === 'symbol') {
    return { __type: 'symbol', value: value.description ?? '' };
  }

  if (typeof value === 'function') {
    return { __type: 'function', value: value.name || 'anonymous' };
  }

  return { __type: typeof value, value: '' };
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(normalizeForStableSerialization(value));
}

/**
 * Tracks unique values per field and per composite key signature.
 *
 * Uses hash-set semantics for expected O(1) membership checks.
 */
export class UniquenessTracker {
  private _seenFieldValues: Map<string, Set<string>> = new Map();

  private _seenCompositeValues: Map<string, Set<string>> = new Map();

  public track(field: string, value: unknown): boolean {
    const seenForField = this._seenFieldValues.get(field) ?? new Set<string>();
    const serializedValue = stableSerialize(value);

    if (seenForField.has(serializedValue)) {
      return false;
    }

    seenForField.add(serializedValue);
    this._seenFieldValues.set(field, seenForField);
    return true;
  }

  public trackComposite(fields: readonly string[], values: readonly unknown[]): boolean {
    if (fields.length === 0 || values.length === 0 || fields.length !== values.length) {
      return false;
    }

    const signature = stableSerialize(fields);
    const seenForComposite = this._seenCompositeValues.get(signature) ?? new Set<string>();

    const compositeEntries = fields.map((field, index) => ({
      field,
      value: values[index],
    }));
    const serializedComposite = stableSerialize(compositeEntries);

    if (seenForComposite.has(serializedComposite)) {
      return false;
    }

    seenForComposite.add(serializedComposite);
    this._seenCompositeValues.set(signature, seenForComposite);
    return true;
  }

  public clear(): void {
    this._seenFieldValues = new Map();
    this._seenCompositeValues = new Map();
  }
}
