import { afterEach, describe, expect, test } from 'bun:test';
import { spawn } from 'bun';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

const CLI_ROOT = path.resolve(import.meta.dir, '../..');
const CLI_PATH = path.join(CLI_ROOT, 'bin/td.ts');

const tempDirectories = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...tempDirectories].map(async (directory) => {
      await fs.rm(directory, { recursive: true, force: true });
      tempDirectories.delete(directory);
    }),
  );
});

async function createHomeDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-config-show-home-'));
  tempDirectories.add(directory);
  return directory;
}

async function createWorkspaceDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-config-show-ws-'));
  tempDirectories.add(directory);
  return directory;
}

async function writeConfig(directory: string, config: unknown): Promise<void> {
  await fs.writeFile(
    path.join(directory, '.tdconfig.json'),
    `${JSON.stringify(config, null, 2)}\n`,
    'utf-8',
  );
}

async function runConfigShow(
  homeDirectory: string,
  workspaceDirectory: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = spawn(['bun', CLI_PATH, 'config', 'show'], {
    cwd: workspaceDirectory,
    env: { ...process.env, HOME: homeDirectory },
    stderr: 'pipe',
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

describe('td config show — output structure', () => {
  test('output includes the priority legend string', async () => {
    const homeDir = await createHomeDirectory();
    const wsDir = await createWorkspaceDirectory();

    const { stdout, exitCode } = await runConfigShow(homeDir, wsDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('field-level');
    expect(stdout).toContain('schema-level');
    expect(stdout).toContain('workspace');
    expect(stdout).toContain('global');
    expect(stdout).toContain('built-in');
  });

  test('output includes the global config file path', async () => {
    const homeDir = await createHomeDirectory();
    const wsDir = await createWorkspaceDirectory();

    const { stdout, exitCode } = await runConfigShow(homeDir, wsDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain(homeDir);
    expect(stdout).toContain('.tdconfig.json');
  });

  test('shows [built-in] for all settings when no config files are found', async () => {
    const homeDir = await createHomeDirectory();
    const wsDir = await createWorkspaceDirectory();

    const { stdout, exitCode } = await runConfigShow(homeDir, wsDir);

    expect(exitCode).toBe(0);
    const occurrences = (stdout.match(/\[built-in\]/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(3);
  });

  test('shows [global] when global config provides the defaults section', async () => {
    const homeDir = await createHomeDirectory();
    const wsDir = await createWorkspaceDirectory();

    await writeConfig(homeDir, { defaults: { count: 5, format: 'json' } });

    const { stdout, exitCode } = await runConfigShow(homeDir, wsDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('[global]');
  });

  test('shows [workspace] when workspace config provides the context section', async () => {
    const homeDir = await createHomeDirectory();
    const wsDir = await createWorkspaceDirectory();

    await writeConfig(wsDir, { context: { saveDirectory: './ws-contexts' } });

    const { stdout, exitCode } = await runConfigShow(homeDir, wsDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('[workspace]');
  });

  test('shows (none) for generatorDefaults when none are configured', async () => {
    const homeDir = await createHomeDirectory();
    const wsDir = await createWorkspaceDirectory();

    const { stdout, exitCode } = await runConfigShow(homeDir, wsDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('(none)');
  });

  test('renders non-empty generatorDefaults as fieldType: generatorName entries', async () => {
    const homeDir = await createHomeDirectory();
    const wsDir = await createWorkspaceDirectory();

    await writeConfig(homeDir, {
      generatorDefaults: [
        { fieldType: 'string', generator: { name: 'pick' } },
        { fieldType: 'number', generator: { name: 'randomNumber' } },
      ],
    });

    const { stdout, exitCode } = await runConfigShow(homeDir, wsDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('string: pick');
    expect(stdout).toContain('number: randomNumber');
  });
});

describe('td config show — error handling', () => {
  test('exits with CliConfigError.exitCode when config loading fails (invalid JSON)', async () => {
    const homeDir = await createHomeDirectory();
    const wsDir = await createWorkspaceDirectory();

    // Write invalid JSON to the global config to trigger CliConfigError
    await fs.writeFile(path.join(homeDir, '.tdconfig.json'), '{"defaults":', 'utf-8');

    const { stderr, exitCode } = await runConfigShow(homeDir, wsDir);

    expect(exitCode).toBe(1);
    expect(stderr).toContain('Error:');
  });
});
