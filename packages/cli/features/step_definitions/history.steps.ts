import { After, Given, Then, When } from '@cucumber/cucumber';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

interface HistoryCommandState {
  workspaceDir?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
}

const state: HistoryCommandState = {};
const CLI_PATH = path.resolve(import.meta.dir, '../../dist/td.js');
const FIXTURES_DIR = path.resolve(import.meta.dir, '../../fixtures');

function requireWorkspaceDir(): string {
  if (!state.workspaceDir) {
    throw new Error('Expected a temporary CLI workspace to exist before this step');
  }

  return state.workspaceDir;
}

function tokenizeCommand(command: string): string[] {
  const tokens = command.match(/"[^"]*"|'[^']*'|[^\s]+/g) ?? [];

  return tokens.map((token) => token.replace(/^['"]|['"]$/g, ''));
}

async function writeWorkspaceFile(relativePath: string, contents: string): Promise<void> {
  const workspaceDir = requireWorkspaceDir();
  const targetPath = path.join(workspaceDir, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${contents.trimEnd()}\n`, 'utf-8');
}

async function readHistoryPatternHashes(): Promise<string[]> {
  const historyPath = path.join(requireWorkspaceDir(), '.td-history.jsonl');
  const content = await readFile(historyPath, 'utf-8');

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as { metadata?: { patternHash?: string } })
    .map((entry) => entry.metadata?.patternHash)
    .filter((value): value is string => typeof value === 'string');
}

Given('the history test CLI workspace is ready', async () => {
  state.workspaceDir ??= await mkdtemp(path.join(tmpdir(), 'testdata-ai-cli-history-bdd-'));

  const cliFile = Bun.file(CLI_PATH);
  if (!(await cliFile.exists())) {
    throw new Error(`Expected CLI entry point to exist at ${CLI_PATH}`);
  }
});

Given('the history test fixture {string} exists in the workspace', async (fixtureName: string) => {
  const workspaceDir = requireWorkspaceDir();
  const fixtureContents = await readFile(path.join(FIXTURES_DIR, fixtureName), 'utf-8');
  await writeFile(path.join(workspaceDir, fixtureName), fixtureContents, 'utf-8');
});

Given('the history test file {string} contains:', async (relativePath: string, docString: string) => {
  await writeWorkspaceFile(relativePath, docString);
});

When('the history test runner executes {string}', async (command: string) => {
  const args = tokenizeCommand(command);
  if (args[0] !== 'td') {
    throw new Error(`Expected command to start with td, received '${command}'`);
  }

  const proc = Bun.spawn(['bun', CLI_PATH, ...args.slice(1)], {
    cwd: requireWorkspaceDir(),
    env: process.env,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  state.stdout = await new Response(proc.stdout).text();
  state.stderr = await new Response(proc.stderr).text();
  state.exitCode = await proc.exited;
});

When('the history test file {string} is updated to:', async (relativePath: string, docString: string) => {
  await writeWorkspaceFile(relativePath, docString);
});

When('the history test runner diffs the latest two history hashes', async () => {
  const hashes = await readHistoryPatternHashes();

  if (hashes.length < 2) {
    throw new Error(`Expected at least two history hashes, received ${hashes.length}`);
  }

  const oldHash = hashes[hashes.length - 2];
  const newHash = hashes[hashes.length - 1];

  if (oldHash === undefined || newHash === undefined) {
    throw new Error(`Expected the latest history entries to include pattern hashes, received: ${JSON.stringify(hashes)}`);
  }

  const proc = Bun.spawn(['bun', CLI_PATH, 'diff', oldHash, newHash], {
    cwd: requireWorkspaceDir(),
    env: process.env,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  state.stdout = await new Response(proc.stdout).text();
  state.stderr = await new Response(proc.stderr).text();
  state.exitCode = await proc.exited;
});

When('the history test runner diffs the latest history hash against an unknown hash', async () => {
  const hashes = await readHistoryPatternHashes();
  const latestHash = hashes[hashes.length - 1];

  if (latestHash === undefined) {
    throw new Error('Expected at least one history hash before diffing against an unknown hash');
  }

  const proc = Bun.spawn(['bun', CLI_PATH, 'diff', 'f'.repeat(64), latestHash], {
    cwd: requireWorkspaceDir(),
    env: process.env,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  state.stdout = await new Response(proc.stdout).text();
  state.stderr = await new Response(proc.stderr).text();
  state.exitCode = await proc.exited;
});

Then('the history command should print {int} entries', (count: number) => {
  const lines = (state.stdout ?? '').trim().split(/\r?\n/).filter((line) => line.length > 0);

  if (lines.length !== count) {
    throw new Error(`Expected ${count} history lines, received ${lines.length}: ${state.stdout ?? ''}`);
  }
});

Then('the history command output should list the newest entry first', () => {
  const lines = (state.stdout ?? '').trim().split(/\r?\n/).filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error(`Expected at least two history lines, received: ${state.stdout ?? ''}`);
  }

  if (!lines[0]?.includes('count=2')) {
    throw new Error(`Expected newest history entry first, received: ${state.stdout ?? ''}`);
  }
});

Then('the history command exit code should be {int}', (expectedExitCode: number) => {
  if (state.exitCode !== expectedExitCode) {
    throw new Error(`Expected exit code ${expectedExitCode}, received ${state.exitCode}`);
  }
});

Then('the diff command output should contain {string}', (expected: string) => {
  if (!(state.stdout ?? '').includes(expected)) {
    throw new Error(`Expected diff stdout to contain '${expected}', received: ${state.stdout ?? ''}`);
  }
});

Then('the diff command stderr should contain {string}', (expected: string) => {
  if (!(state.stderr ?? '').includes(expected)) {
    throw new Error(`Expected diff stderr to contain '${expected}', received: ${state.stderr ?? ''}`);
  }
});

Then('the diff command exit code should be {int}', (expectedExitCode: number) => {
  if (state.exitCode !== expectedExitCode) {
    throw new Error(`Expected diff exit code ${expectedExitCode}, received ${state.exitCode}`);
  }
});

After(async () => {
  if (state.workspaceDir) {
    await rm(state.workspaceDir, { recursive: true, force: true });
  }

  state.workspaceDir = undefined;
  state.exitCode = undefined;
  state.stdout = undefined;
  state.stderr = undefined;
});