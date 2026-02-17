const TEMPLATE_REFERENCE_PATTERN = /\{\{\s*([^}]+?)\s*\}\}/g;

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
  return template.replace(TEMPLATE_REFERENCE_PATTERN, (_match, rawKey: string): string => {
    const key = rawKey.trim();

    if (!Object.prototype.hasOwnProperty.call(context, key)) {
      throw new Error(
        `Template reference '${key}' is missing in context while evaluating '${template}'`,
      );
    }

    return toTemplateString(context[key]);
  });
}
