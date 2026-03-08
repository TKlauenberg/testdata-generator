import { After, Given, Then, When } from '@cucumber/cucumber';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

interface CliBddState {
  workspaceDir?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
}

const state: CliBddState = {};
const CLI_PATH = path.resolve(import.meta.dir, '../../bin/td.ts');

function requireWorkspaceDir(): string {
  if (!state.workspaceDir) {
    throw new Error('Expected a temporary CLI workspace to be created before using it');
  }

  return state.workspaceDir;
}

function tokenizeCommand(command: string): string[] {
  const tokens = command.match(/"[^"]*"|'[^']*'|[^\s]+/g) ?? [];

  return tokens.map((token) => token.replace(/^['"]|['"]$/g, ''));
}

async function readSavedContext(relativePath: string): Promise<{
  readonly metadata: {
    readonly sourcePattern?: string;
    readonly count: number;
  };
  readonly data: readonly unknown[];
}> {
  const filePath = path.join(requireWorkspaceDir(), relativePath);
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content) as {
    readonly metadata: {
      readonly sourcePattern?: string;
      readonly count: number;
    };
    readonly data: readonly unknown[];
  };
}

Given('a temporary CLI workspace', async () => {
  state.workspaceDir = await mkdtemp(path.join(tmpdir(), 'testdata-ai-cli-bdd-'));
});

Given('a DSL schema file {string} with contents:', async (fileName: string, contents: string) => {
  const filePath = path.join(requireWorkspaceDir(), fileName);
  await writeFile(filePath, `${contents.trim()}\n`, 'utf-8');
});

When('the tester runs {string}', async (command: string) => {
  const args = tokenizeCommand(command);
  if (args[0] !== 'td') {
    throw new Error(`Expected command to start with td, received '${command}'`);
  }

  const proc = Bun.spawn(['bun', CLI_PATH, ...args.slice(1)], {
    cwd: requireWorkspaceDir(),
    stdout: 'pipe',
    stderr: 'pipe',
  });

  state.stdout = await new Response(proc.stdout).text();
  state.stderr = await new Response(proc.stderr).text();
  state.exitCode = await proc.exited;
});

Then('the CLI exit code should be {int}', (expectedExitCode: number) => {
  if (state.exitCode !== expectedExitCode) {
    throw new Error(
      `Expected CLI exit code ${expectedExitCode}, received ${state.exitCode}. stderr: ${state.stderr ?? ''}`,
    );
  }
});

Then('the saved context file {string} should exist', async (relativePath: string) => {
  const filePath = path.join(requireWorkspaceDir(), relativePath);
  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    throw new Error(`Expected saved context file to exist: ${relativePath}`);
  }
});

Then('the saved context file {string} should contain {int} records', async (relativePath: string, count: number) => {
  const savedContext = await readSavedContext(relativePath);

  if (savedContext.metadata.count !== count) {
    throw new Error(`Expected metadata count ${count}, received ${savedContext.metadata.count}`);
  }

  if (savedContext.data.length !== count) {
    throw new Error(`Expected saved data length ${count}, received ${savedContext.data.length}`);
  }
});

Then('the saved context file {string} should record source pattern {string}', async (relativePath: string, sourcePattern: string) => {
  const savedContext = await readSavedContext(relativePath);

  if (savedContext.metadata.sourcePattern !== sourcePattern) {
    throw new Error(
      `Expected source pattern '${sourcePattern}', received '${savedContext.metadata.sourcePattern ?? '<missing>'}'`,
    );
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
