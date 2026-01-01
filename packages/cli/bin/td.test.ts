import { describe, test, expect } from 'bun:test';
import { spawn } from 'bun';

describe('CLI', () => {
  test('shows version', async () => {
    const proc = spawn(['bun', 'packages/cli/bin/td.ts', '--version']);
    const output = await new Response(proc.stdout).text();
    expect(output).toContain('0.1.0');
  });

  test('shows help', async () => {
    const proc = spawn(['bun', 'packages/cli/bin/td.ts', '--help']);
    const output = await new Response(proc.stdout).text();
    expect(output).toContain('testdata-ai');
    expect(output).toContain('Declarative test data generation');
  });

  test('displays CLI name', async () => {
    const proc = spawn(['bun', 'packages/cli/bin/td.ts', '--help']);
    const output = await new Response(proc.stdout).text();
    expect(output).toContain('td');
  });
});
