import { afterEach, describe, expect, test } from 'bun:test';
import { spawn } from 'bun';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

const CLI_ROOT = path.resolve(import.meta.dir, '../..');
const CLI_PATH = path.join(CLI_ROOT, 'bin/td.ts');
const FIXTURES_DIR = path.join(CLI_ROOT, 'fixtures');

const tempDirectories = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...tempDirectories].map(async (directory) => {
      await fs.rm(directory, { recursive: true, force: true });
      tempDirectories.delete(directory);
    }),
  );
});

async function createWorkspaceDirectory(prefix: string): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirectories.add(directory);
  return directory;
}

async function writeFixture(workspaceDirectory: string, fixtureName: string): Promise<void> {
  await fs.writeFile(
    path.join(workspaceDirectory, fixtureName),
    await fs.readFile(path.join(FIXTURES_DIR, fixtureName), 'utf-8'),
    'utf-8',
  );
}

async function runCli(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = spawn(['bun', CLI_PATH, ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  });

  return {
    stdout: await new Response(proc.stdout).text(),
    stderr: await new Response(proc.stderr).text(),
    exitCode: await proc.exited,
  };
}

async function readPatternHashes(historyPath: string): Promise<string[]> {
  return (await fs.readFile(historyPath, 'utf-8'))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as { metadata?: { patternHash?: string } })
    .map((entry) => entry.metadata?.patternHash)
    .filter((value): value is string => typeof value === 'string');
}

describe('td diff', () => {
  test('shows preserved root-pattern changes between two stored hashes', async () => {
    const workspaceDirectory = await createWorkspaceDirectory('testdata-generator-diff-command-');
    await writeFixture(workspaceDirectory, 'valid-simple.td');

    await runCli(['generate', 'valid-simple.td', '--count', '1'], workspaceDirectory);
    await fs.writeFile(
      path.join(workspaceDirectory, 'valid-simple.td'),
      ['schema User {', '  id: number', '  name: string', '  active: boolean', '  email: string', '}', ''].join('\n'),
      'utf-8',
    );
    await runCli(['generate', 'valid-simple.td', '--count', '1'], workspaceDirectory);

    const hashes = await readPatternHashes(path.join(workspaceDirectory, '.td-history.jsonl'));
    const diff = await runCli(['diff', hashes[0] as string, hashes[1] as string], workspaceDirectory);

    expect(diff.exitCode).toBe(0);
    expect(diff.stdout).toContain('classification | potentially-breaking');
    expect(diff.stdout).toContain('modified | root-pattern | valid-simple.td');
    expect(diff.stdout).toContain('excerpt | valid-simple.td');
  });

  test('reports no changes for identical hashes', async () => {
    const workspaceDirectory = await createWorkspaceDirectory('testdata-generator-diff-identical-');
    await writeFixture(workspaceDirectory, 'valid-simple.td');

    await runCli(['generate', 'valid-simple.td', '--count', '1'], workspaceDirectory);
    await runCli(['generate', 'valid-simple.td', '--count', '2'], workspaceDirectory);

    const hashes = await readPatternHashes(path.join(workspaceDirectory, '.td-history.jsonl'));
    const diff = await runCli(['diff', hashes[0] as string, hashes[1] as string], workspaceDirectory);

    expect(hashes[0]).toBe(hashes[1]);
    expect(diff.exitCode).toBe(0);
    expect(diff.stdout).toContain('No changes between pattern versions');
  });

  test('returns a controlled error when either hash is unknown', async () => {
    const workspaceDirectory = await createWorkspaceDirectory('testdata-generator-diff-missing-');
    await writeFixture(workspaceDirectory, 'valid-simple.td');

    await runCli(['generate', 'valid-simple.td', '--count', '1'], workspaceDirectory);

    const hashes = await readPatternHashes(path.join(workspaceDirectory, '.td-history.jsonl'));
    const diff = await runCli(['diff', 'f'.repeat(64), hashes[0] as string], workspaceDirectory);

    expect(diff.exitCode).toBe(1);
    expect(diff.stderr).toContain('Unknown pattern hash');
  });

  test('rejects invalid hash arguments before reading from the snapshot store', async () => {
    const workspaceDirectory = await createWorkspaceDirectory('testdata-generator-diff-invalid-hash-');
    await writeFixture(workspaceDirectory, 'valid-simple.td');

    await runCli(['generate', 'valid-simple.td', '--count', '1'], workspaceDirectory);

    const diff = await runCli(['diff', '../escape', 'f'.repeat(64)], workspaceDirectory);

    expect(diff.exitCode).toBe(1);
    expect(diff.stderr).toContain('Invalid pattern hash');
  });

  test('resolves snapshots from the configured workspace-relative history directory', async () => {
    const workspaceDirectory = await createWorkspaceDirectory('testdata-generator-diff-workspace-root-');
    const nestedDirectory = path.join(workspaceDirectory, 'apps', 'qa');

    await fs.mkdir(nestedDirectory, { recursive: true });
    await writeFixture(nestedDirectory, 'valid-simple.td');
    await fs.writeFile(
      path.join(workspaceDirectory, '.tdconfig.json'),
      JSON.stringify({ history: { logDirectory: 'audit/trail' } }, null, 2),
      'utf-8',
    );

    await runCli(['generate', 'valid-simple.td', '--count', '1'], nestedDirectory);
    await fs.writeFile(
      path.join(nestedDirectory, 'valid-simple.td'),
      ['schema User {', '  id: number', '  name: string', '  active: boolean', '  region: string', '}', ''].join('\n'),
      'utf-8',
    );
    await runCli(['generate', 'valid-simple.td', '--count', '1'], nestedDirectory);

    const historyPath = path.join(workspaceDirectory, 'audit', 'trail', '.td-history.jsonl');
    const hashes = await readPatternHashes(historyPath);
    const diff = await runCli(['diff', hashes[0] as string, hashes[1] as string], nestedDirectory);

    expect(diff.exitCode).toBe(0);
    expect(diff.stdout).toContain('modified | root-pattern | valid-simple.td');
    expect(await fs.access(path.join(workspaceDirectory, 'audit', 'trail', '.td-pattern-versions', `${hashes[0]}.json`)).then(() => true).catch(() => false)).toBe(true);
  });
});