import { describe, it, expect } from 'bun:test';
import { evaluateTemplate } from './template';

describe('evaluateTemplate', () => {
  it('replaces a single template reference', () => {
    const result = evaluateTemplate('{{firstName}}', {
      firstName: 'Ada',
    });

    expect(result).toBe('Ada');
  });

  it('replaces multiple references in one template', () => {
    const result = evaluateTemplate('{{firstName}}.{{lastName}}@test.com', {
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(result).toBe('Ada.Lovelace@test.com');
  });

  it('replaces repeated references', () => {
    const result = evaluateTemplate('{{firstName}}-{{firstName}}', {
      firstName: 'Grace',
    });

    expect(result).toBe('Grace-Grace');
  });

  it('supports whitespace inside placeholder braces', () => {
    const result = evaluateTemplate('user={{ firstName }}', {
      firstName: 'Linus',
    });

    expect(result).toBe('user=Linus');
  });

  it('converts scalar values to strings predictably', () => {
    const result = evaluateTemplate('id={{id}},active={{active}}', {
      id: 42,
      active: false,
    });

    expect(result).toBe('id=42,active=false');
  });

  it('throws a helpful error for missing references', () => {
    expect(() =>
      evaluateTemplate('{{firstName}} {{missingField}}', {
        firstName: 'Ada',
      }),
    ).toThrow(/missingField/i);
  });
});