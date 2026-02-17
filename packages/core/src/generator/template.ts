/**
 * Returns true if a string contains at least one `{{...}}` template placeholder.
 *
 * Use this for fast detection before invoking evaluateTemplate.
 */
export function hasTemplateReferences(value: string): boolean {
  return /\{\{\s*[^}]+\s*\}\}/.test(value);
}

/**
 * Converts an arbitrary context value to a string for template substitution.
 *
 * Conversion rules:
 * - `string` → returned as-is
 * - `number`, `boolean`, `bigint` → `String(value)`
 * - `null` → the literal string `"null"`
 * - `undefined` → the literal string `"undefined"`
 * - objects / arrays → `JSON.stringify(value)`
 *
 * **Note:** `null` and `undefined` resolve to the literal strings `"null"` and
 * `"undefined"`. If a template field can be null/undefined, consider guarding
 * the field value before generation or treating it as a schema error.
 */
function toTemplateString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  return JSON.stringify(value);
}

export function evaluateTemplate(
  template: string,
  context: Record<string, unknown>,
): string {
  // Create the regex per-call (no /g-flag module-scope singleton) so that
  // `lastIndex` state is never shared across concurrent or sequential calls.
  const pattern = /\{\{\s*([^}]+?)\s*\}\}/g;

  return template.replace(pattern, (_match, rawKey: string): string => {
    const key = rawKey.trim();

    if (!Object.prototype.hasOwnProperty.call(context, key)) {
      throw new Error(
        `Template reference '${key}' is missing in context while evaluating '${template}'`,
      );
    }

    return toTemplateString(context[key]);
  });
}
