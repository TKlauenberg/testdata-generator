import { After, Given, Then, When } from '@cucumber/cucumber';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

interface GenerateCommandState {
  workspaceDir?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
}

const state: GenerateCommandState = {};
const CLI_PATH = path.resolve(import.meta.dir, '../../bin/td.ts');
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

function parseCsvLines(input: string): string[] {
  return input
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

async function readSavedContext(relativePath: string): Promise<{
  readonly metadata: {
    readonly count: number;
  };
  readonly data: readonly unknown[];
}> {
  const filePath = path.join(requireWorkspaceDir(), relativePath);
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content) as {
    readonly metadata: {
      readonly count: number;
    };
    readonly data: readonly unknown[];
  };
}

Given('the testdata-ai CLI is installed', async () => {
  state.workspaceDir ??= await mkdtemp(path.join(tmpdir(), 'testdata-ai-cli-generate-bdd-'));

  const cliFile = Bun.file(CLI_PATH);
  if (!(await cliFile.exists())) {
    throw new Error(`Expected CLI entry point to exist at ${CLI_PATH}`);
  }
});

Given('QA Tester has a valid DSL schema fixture {string}', async (fixtureName: string) => {
  const workspaceDir = requireWorkspaceDir();
  const fixtureContents = await readFile(path.join(FIXTURES_DIR, fixtureName), 'utf-8');
  await writeFile(path.join(workspaceDir, fixtureName), fixtureContents, 'utf-8');
});

When('QA Tester runs {string}', async (command: string) => {
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

Then('QA Tester should see JSON output on stdout', () => {
  const parsed = JSON.parse(state.stdout ?? '') as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array output, received: ${state.stdout ?? ''}`);
  }
});

Then('QA Tester should see CSV output on stdout', () => {
  const lines = parseCsvLines(state.stdout ?? '');

  if (lines[0] !== 'id,name,active') {
    throw new Error(`Expected CSV header, received: ${state.stdout ?? ''}`);
  }
});

Then('QA Tester should see SQL output for table {string} on stdout', (tableName: string) => {
  const stdout = state.stdout ?? '';

  if (!stdout.includes(`INSERT INTO "${tableName}"`)) {
    throw new Error(`Expected SQL output for table '${tableName}', received: ${stdout}`);
  }
});

Then('the generated file {string} should start with {string}', async (relativePath: string, prefix: string) => {
  const content = await readFile(path.join(requireWorkspaceDir(), relativePath), 'utf-8');

  if (!content.startsWith(prefix)) {
    throw new Error(`Expected ${relativePath} to start with '${prefix}', received: ${content}`);
  }
});

Then('the generated file {string} should contain SQL inserts for table {string}', async (relativePath: string, tableName: string) => {
  const content = await readFile(path.join(requireWorkspaceDir(), relativePath), 'utf-8');

  if (!content.includes(`INSERT INTO "${tableName}"`)) {
    throw new Error(`Expected SQL inserts for table '${tableName}', received: ${content}`);
  }
});

Then('stderr should contain {string}', (expectedText: string) => {
  if (!(state.stderr ?? '').includes(expectedText)) {
    throw new Error(`Expected stderr to contain '${expectedText}', received: ${state.stderr ?? ''}`);
  }
});

Then('the generate command exit code should be {int}', (expectedExitCode: number) => {
  if (state.exitCode !== expectedExitCode) {
    throw new Error(`Expected exit code ${expectedExitCode}, received ${state.exitCode}`);
  }
});

Then('the generated context file {string} should exist', async (relativePath: string) => {
  const file = Bun.file(path.join(requireWorkspaceDir(), relativePath));

  if (!(await file.exists())) {
    throw new Error(`Expected saved context file to exist: ${relativePath}`);
  }
});

Then('the generated context file {string} should contain {int} records', async (relativePath: string, count: number) => {
  const savedContext = await readSavedContext(relativePath);

  if (savedContext.metadata.count !== count) {
    throw new Error(`Expected saved context metadata count ${count}, received ${savedContext.metadata.count}`);
  }

  if (savedContext.data.length !== count) {
    throw new Error(`Expected saved context data length ${count}, received ${savedContext.data.length}`);
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