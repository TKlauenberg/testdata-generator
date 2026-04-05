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

async function createWorkspaceDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-history-command-'));
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

describe('td history', () => {
  test('shows a clear empty-state message when no history file exists yet', async () => {
    const workspaceDirectory = await createWorkspaceDirectory();

    const proc = spawn(['bun', CLI_PATH, 'history'], {
      cwd: workspaceDirectory,
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain('No generation history found yet');
  });

  test('shows the requested number of newest entries first with --last', async () => {
    const workspaceDirectory = await createWorkspaceDirectory();
    await writeFixture(workspaceDirectory, 'valid-simple.td');

    for (const count of ['1', '2']) {
      const generateProc = spawn([
        'bun',
        CLI_PATH,
        'generate',
        'valid-simple.td',
        '--count',
        count,
      ], {
        cwd: workspaceDirectory,
        stderr: 'pipe',
      });

      await generateProc.exited;
    }

    const proc = spawn(['bun', CLI_PATH, 'history', '--last', '2'], {
      cwd: workspaceDirectory,
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    const lines = stdout.trim().split(/\r?\n/);

    expect(exitCode).toBe(0);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('count=2');
    expect(lines[1]).toContain('count=1');
    expect(lines[0]).toContain('| success |');
  });

  test('reads history from the configured workspace-relative directory', async () => {
    const workspaceDirectory = await createWorkspaceDirectory();
    const nestedDirectory = path.join(workspaceDirectory, 'apps', 'qa');

    await fs.mkdir(nestedDirectory, { recursive: true });
    await writeFixture(nestedDirectory, 'valid-simple.td');
    await fs.writeFile(
      path.join(workspaceDirectory, '.tdconfig.json'),
      JSON.stringify({ history: { logDirectory: 'audit/trail' } }, null, 2),
      'utf-8',
    );

    const generateProc = spawn([
      'bun',
      CLI_PATH,
      'generate',
      'valid-simple.td',
    ], {
      cwd: nestedDirectory,
      stderr: 'pipe',
    });
    await generateProc.exited;

    const proc = spawn(['bun', CLI_PATH, 'history', '--last', '1'], {
      cwd: nestedDirectory,
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain('| success |');
    expect(await fs.access(path.join(workspaceDirectory, 'audit/trail/.td-history.jsonl')).then(() => true).catch(() => false)).toBe(true);
  });
});