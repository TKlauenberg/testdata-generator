import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Parser } from '../parser/parser';
import { Scanner } from '../scanner/scanner';
import { resolveProgramImports } from './importResolver';

function parseProgram(source: string, filePath: string) {
  const scanResult = new Scanner(source, filePath).scan();
  if (!scanResult.ok) {
    throw new Error(`Expected scanner success, received: ${scanResult.errors.map((error) => error.message).join('; ')}`);
  }

  const parseResult = new Parser(scanResult.value).parse();
  if (!parseResult.ok) {
    throw new Error(`Expected parser success, received: ${parseResult.errors.map((error) => error.message).join('; ')}`);
  }

  return parseResult.value;
}

describe('resolveProgramImports()', () => {
  test('suggests a nearby relative .td file when an import path has a typo', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-import-typo-'));
    const commonDir = path.join(workspace, 'common');
    const mainFile = path.join(workspace, 'main.td');
    const profileFile = path.join(commonDir, 'profile.td');

    await fs.mkdir(commonDir, { recursive: true });
    await fs.writeFile(profileFile, 'schema Profile { id: uuid }\n', 'utf-8');

    try {
      const source = [
        '@import "./comon/profile.td"',
        '',
        'schema User {',
        '  account: Profile',
        '}',
      ].join('\n');

      const result = resolveProgramImports(parseProgram(source, mainFile), {
        currentFile: mainFile,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('analyzer.unresolvedImport');
        expect(result.errors[0]?.suggestion).toContain('./common/profile.td');
      }
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  });

  test('suggests a workspace-relative file when a relative import points to the wrong directory', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-import-moved-file-'));
    const appsDir = path.join(workspace, 'apps');
    const commonDir = path.join(workspace, 'common');
    const mainFile = path.join(appsDir, 'main.td');
    const profileFile = path.join(commonDir, 'profile.td');

    await fs.mkdir(appsDir, { recursive: true });
    await fs.mkdir(commonDir, { recursive: true });
    await fs.writeFile(profileFile, 'schema Profile { id: uuid }\n', 'utf-8');

    try {
      const source = [
        '@import "./profile.td"',
        '',
        'schema User {',
        '  account: Profile',
        '}',
      ].join('\n');

      const result = resolveProgramImports(parseProgram(source, mainFile), {
        currentFile: mainFile,
        workspaceRoot: workspace,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.suggestion).toContain('../common/profile.td');
      }
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  });

  test('fails clearly for workspace imports when no workspace root is available', () => {
    const currentFile = path.join('/tmp', 'apps', 'main.td');
    const source = [
      '@import "@workspace/common/shared.td"',
      '',
      'schema User {',
      '  id: uuid',
      '}',
    ].join('\n');

    const result = resolveProgramImports(parseProgram(source, currentFile), {
      currentFile,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe('analyzer.unresolvedImport');
      expect(result.errors[0]?.suggestion).toContain('ValidationOptions.workspaceRoot');
    }
  });

  test('detects circular imports using canonical file paths', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-import-cycle-'));
    const aFile = path.join(workspace, 'a.td');
    const bFile = path.join(workspace, 'nested', 'b.td');

    await fs.mkdir(path.dirname(bFile), { recursive: true });
    await fs.writeFile(
      aFile,
      ['@import "./nested/b.td"', '', 'schema User {', '  account: Profile', '}', ''].join('\n'),
      'utf-8',
    );
    await fs.writeFile(
      bFile,
      ['@import "../nested/../a.td"', '', 'schema Profile {', '  id: uuid', '}', ''].join('\n'),
      'utf-8',
    );

    try {
      const source = await fs.readFile(aFile, 'utf-8');
      const result = resolveProgramImports(parseProgram(source, aFile), {
        currentFile: aFile,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('analyzer.circularDependency');
        expect(result.errors[0]?.message).toContain('a.td');
        expect(result.errors[0]?.message).toContain('b.td');
      }
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  });

  test('suggests a workspace-relative import when the workspace path has a typo', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-workspace-import-typo-'));
    const commonDir = path.join(workspace, 'common');
    const appsDir = path.join(workspace, 'apps');
    const currentFile = path.join(appsDir, 'main.td');
    const sharedFile = path.join(commonDir, 'profile.td');

    await fs.mkdir(commonDir, { recursive: true });
    await fs.mkdir(appsDir, { recursive: true });
    await fs.writeFile(sharedFile, 'schema SharedProfile { id: uuid }\n', 'utf-8');

    try {
      const source = [
        '@import "@workspace/comon/profile.td"',
        '',
        'schema User {',
        '  account: SharedProfile',
        '}',
      ].join('\n');

      const result = resolveProgramImports(parseProgram(source, currentFile), {
        currentFile,
        workspaceRoot: workspace,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('analyzer.unresolvedImport');
        expect(result.errors[0]?.suggestion).toContain('@workspace/common/profile.td');
      }
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  });

  test('never suggests importing the current file itself', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-self-import-suggestion-'));
    const mainFile = path.join(workspace, 'main.td');

    await fs.writeFile(mainFile, 'schema Main { id: uuid }\n', 'utf-8');

    try {
      const source = [
        '@import "./man.td"',
        '',
        'schema User {',
        '  id: uuid',
        '}',
      ].join('\n');

      const result = resolveProgramImports(parseProgram(source, mainFile), {
        currentFile: mainFile,
        workspaceRoot: workspace,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.suggestion).toBeUndefined();
      }
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  });
});