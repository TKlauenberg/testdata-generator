import { After, Given, Then, When } from '@cucumber/cucumber';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

interface CliBddState {
  workspaceDir?: string;
  homeDir?: string;
  commandDir?: string;
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
    readonly seed?: number;
    readonly patternHash?: string;
    readonly lineage?: readonly {
      readonly type: string;
      readonly identifier: string;
      readonly hash: string;
    }[];
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
  state.workspaceDir = await mkdtemp(path.join(tmpdir(), 'testdata-generator-cli-bdd-'));
});

Given('a DSL schema file {string} with contents:', async (fileName: string, contents: string) => {
  const filePath = path.join(requireWorkspaceDir(), fileName);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${contents.trim()}\n`, 'utf-8');
});

Given('a global CLI config file with contents:', async (contents: string) => {
  const workspaceDir = requireWorkspaceDir();
  state.homeDir = path.join(workspaceDir, 'home');
  await mkdir(state.homeDir, { recursive: true });
  await Bun.write(path.join(state.homeDir, '.tdconfig.json'), `${contents.trim()}\n`);
});

Given('a workspace CLI config file with contents:', async (contents: string) => {
  await Bun.write(path.join(requireWorkspaceDir(), '.tdconfig.json'), `${contents.trim()}\n`);
});

Given('a nested working directory {string}', async (relativePath: string) => {
  state.commandDir = path.join(requireWorkspaceDir(), relativePath);
  await mkdir(state.commandDir, { recursive: true });
});

When('the tester runs {string}', async (command: string) => {
  const args = tokenizeCommand(command);
  if (args[0] !== 'td') {
    throw new Error(`Expected command to start with td, received '${command}'`);
  }

  const proc = Bun.spawn(['bun', CLI_PATH, ...args.slice(1)], {
    cwd: state.commandDir ?? requireWorkspaceDir(),
    env: {
      ...process.env,
      HOME: state.homeDir ?? process.env.HOME,
    },
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

Then('the saved context file {string} should record seed {int}', async (relativePath: string, seed: number) => {
  const savedContext = await readSavedContext(relativePath);

  if (savedContext.metadata.seed !== seed) {
    throw new Error(
      `Expected seed ${seed}, received ${savedContext.metadata.seed ?? '<missing>'}`,
    );
  }
});

Then('the saved context file {string} should include a pattern hash', async (relativePath: string) => {
  const savedContext = await readSavedContext(relativePath);

  if (!savedContext.metadata.patternHash) {
    throw new Error(`Expected pattern hash to be present in ${relativePath}`);
  }
});

Then('the saved context file {string} should include lineage metadata', async (relativePath: string) => {
  const savedContext = await readSavedContext(relativePath);

  if (!savedContext.metadata.lineage || savedContext.metadata.lineage.length === 0) {
    throw new Error(`Expected lineage metadata to be present in ${relativePath}`);
  }
});

Then('stdout should contain {int} generated records', (count: number) => {
  const stdout = state.stdout ?? '';
  const parsed = JSON.parse(stdout) as unknown;

  if (
    parsed === null
    || typeof parsed !== 'object'
    || Array.isArray(parsed)
    || !('data' in parsed)
    || !Array.isArray((parsed as { readonly data?: unknown }).data)
  ) {
    throw new Error(`Expected stdout to contain a JSON metadata envelope, received: ${stdout}`);
  }

  const records = (parsed as { readonly data: readonly unknown[] }).data;

  if (records.length !== count) {
    throw new Error(`Expected ${count} generated records, received ${records.length}`);
  }
});

After(async () => {
  if (state.workspaceDir) {
    await rm(state.workspaceDir, { recursive: true, force: true });
  }

  state.workspaceDir = undefined;
  state.homeDir = undefined;
  state.commandDir = undefined;
  state.exitCode = undefined;
  state.stdout = undefined;
  state.stderr = undefined;
});
