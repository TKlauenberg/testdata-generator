import { After, Given, Then, When } from '@cucumber/cucumber';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

After(async () => {
  if (state.workspaceDir) {
    await rm(state.workspaceDir, { recursive: true, force: true });
  }

  state.workspaceDir = undefined;
  state.exitCode = undefined;
  state.stdout = undefined;
  state.stderr = undefined;
});