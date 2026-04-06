import { After, Given, Then, When } from '@cucumber/cucumber';
import {
  appendGenerationHistoryEntry,
  createGenerationHistoryEntry,
  createGenerationMetadata,
  createPatternVersionSnapshot,
  generate,
  JsonAdapter,
  persistPatternVersionSnapshot,
  saveAsContext,
  validateSchema,
} from '@testdata-generator/core';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

interface ExportCommandState {
  workspaceDir?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
}

const state: ExportCommandState = {};
const CLI_PATH = path.resolve(import.meta.dir, '../../dist/td.js');

function requireWorkspaceDir(): string {
  if (!state.workspaceDir) {
    throw new Error('Expected the export test workspace to exist before using it');
  }

  return state.workspaceDir;
}

function tokenizeCommand(command: string): string[] {
  const tokens = command.match(/"[^"]*"|'[^']*'|[^\s]+/g) ?? [];

  return tokens.map((token) => token.replace(/^['"]|['"]$/g, ''));
}

async function ensureAuditTrail(metadata: ReturnType<typeof createGenerationMetadata>): Promise<void> {
  const workspaceDir = requireWorkspaceDir();
  const historyPath = path.join(workspaceDir, '.td-history.jsonl');
  const snapshotDirectory = path.join(workspaceDir, '.td-pattern-versions');
  const lineageInputs = [
    {
      type: 'root-pattern' as const,
      identifier: 'exportable.td',
      content: 'schema Exportable { email: string generator=pick(array=["@context.users.random.email"]) }',
    },
  ];

  await appendGenerationHistoryEntry(
    historyPath,
    createGenerationHistoryEntry({
      metadata,
      status: 'success',
      durationMs: 120,
      recordsPerSecond: 16.67,
      outputPath: 'reports/exportable.json',
    }),
  );

  const snapshot = createPatternVersionSnapshot({ metadata, lineageInputs });
  if (!snapshot) {
    throw new Error('Expected pattern version snapshot to be created for export BDD setup');
  }

  await persistPatternVersionSnapshot(snapshotDirectory, snapshot);
}

async function createContextBackedGeneratedArtifact(relativePath: string): Promise<void> {
  const workspaceDir = requireWorkspaceDir();
  const absolutePath = path.join(workspaceDir, relativePath);
  const source = [
    'schema Exportable {',
    '  email: string generator=pick(array=["@context.users.random.email"] )',
    '}',
    '',
  ].join('\n');
  const validationResult = validateSchema(source, path.join(workspaceDir, 'exportable.td'), {
    availableContextCollections: ['users'],
    currentFile: path.join(workspaceDir, 'exportable.td'),
  });

  if (!validationResult.ok) {
    throw new Error(`Expected context-backed schema to validate successfully: ${validationResult.errors[0]?.message ?? 'unknown error'}`);
  }

  const metadata = createGenerationMetadata({
    timestamp: '2026-04-06T09:15:00.000Z',
    sourcePattern: 'exportable.td',
    count: 2,
    format: 'json',
    seed: 42,
    version: '0.1.0',
    lineageInputs: [
      {
        type: 'root-pattern',
        identifier: 'exportable.td',
        content: source,
      },
    ],
    platformReserved: validationResult.value.metadata.contextReferences === undefined
      ? undefined
      : {
        contextReferences: validationResult.value.metadata.contextReferences,
      },
  });

  await mkdir(path.dirname(absolutePath), { recursive: true });
  const adapter = new JsonAdapter({
    outputPath: absolutePath,
    metadata,
  });
  await adapter.write(generate(validationResult.value, {
    count: 2,
    seed: 42,
    context: {
      users: [
        { email: 'qa.one@example.com' },
        { email: 'qa.two@example.com' },
      ],
    },
  }));
  await ensureAuditTrail(metadata);
}

async function createSavedContextArtifact(relativePath: string): Promise<void> {
  const workspaceDir = requireWorkspaceDir();
  const metadata = createGenerationMetadata({
    timestamp: '2026-04-06T09:15:00.000Z',
    sourcePattern: 'exportable.td',
    count: 2,
    format: 'csv',
    seed: 42,
    version: '0.1.0',
    lineageInputs: [
      {
        type: 'root-pattern',
        identifier: 'exportable.td',
        content: 'schema Exportable { email: string generator=pick(array=["@context.users.random.email"]) }',
      },
    ],
    platformReserved: {
      contextReferences: [
        {
          raw: '@context.users.random.email',
          collection: 'users',
          tags: [],
          selector: { kind: 'random' },
          fieldPath: ['email'],
        },
      ],
    },
  });

  await mkdir(path.dirname(path.join(workspaceDir, relativePath)), { recursive: true });
  await saveAsContext(
    [
      { id: 1, email: 'qa.one@example.com' },
      { id: 2, email: 'qa.two@example.com' },
    ],
    path.parse(relativePath).name,
    ['staging'],
    {
      directory: path.dirname(path.join(workspaceDir, relativePath)),
      timestamp: metadata.timestamp,
      sourcePattern: metadata.sourcePattern,
      format: metadata.format,
      version: metadata.version,
      seed: metadata.seed,
      patternHash: metadata.patternHash,
      lineage: metadata.lineage,
      platformReserved: metadata.platformReserved,
    },
  );
  await ensureAuditTrail(metadata);
}

Given('the export test workspace exists', async () => {
  state.workspaceDir ??= await mkdtemp(path.join(tmpdir(), 'testdata-generator-cli-export-bdd-'));
});

Given('a context-backed generated JSON artifact {string} with matching audit history', async (relativePath: string) => {
  await createContextBackedGeneratedArtifact(relativePath);
});

Given('a saved-context export artifact {string} with matching audit history', async (relativePath: string) => {
  await createSavedContextArtifact(relativePath);
});

When('the operator runs {string}', async (command: string) => {
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

Then('the export command exit code should be {int}', (expectedExitCode: number) => {
  if (state.exitCode !== expectedExitCode) {
    throw new Error(`Expected exit code ${expectedExitCode}, received ${state.exitCode}. stderr: ${state.stderr ?? ''}`);
  }
});

Then('stdout should contain a platform-ready export bundle', () => {
  const parsed = JSON.parse(state.stdout ?? '') as { readonly contract?: string; readonly version?: number };
  if (parsed.contract !== 'testdata-generator/platform-ready-export' || parsed.version !== 1) {
    throw new Error(`Expected a platform-ready export bundle, received: ${state.stdout ?? ''}`);
  }
});

Then('the platform-ready bundle should describe artifact type {string}', (artifactType: string) => {
  const parsed = JSON.parse(state.stdout ?? '') as { readonly artifact?: { readonly type?: string } };
  if (parsed.artifact?.type !== artifactType) {
    throw new Error(`Expected artifact type '${artifactType}', received '${parsed.artifact?.type ?? '<missing>'}'`);
  }
});

Then('the platform-ready bundle should preserve context reference metadata', () => {
  const parsed = JSON.parse(state.stdout ?? '') as {
    readonly metadata?: {
      readonly platformReserved?: {
        readonly contextReferences?: readonly Array<{ readonly raw?: string }>;
      };
    };
  };
  const contextReferences = parsed.metadata?.platformReserved?.contextReferences ?? [];
  if (contextReferences.length === 0 || contextReferences[0]?.raw !== '@context.users.random.email') {
    throw new Error(`Expected preserved context reference metadata, received: ${state.stdout ?? ''}`);
  }
});

Then('the platform-ready bundle should include matching history and pattern snapshot data', () => {
  const parsed = JSON.parse(state.stdout ?? '') as {
    readonly historyEntry?: { readonly metadata?: { readonly patternHash?: string } };
    readonly patternSnapshot?: { readonly patternHash?: string };
  };
  if (
    !parsed.historyEntry?.metadata?.patternHash
    || parsed.historyEntry.metadata.patternHash !== parsed.patternSnapshot?.patternHash
  ) {
    throw new Error(`Expected matching history and pattern snapshot data, received: ${state.stdout ?? ''}`);
  }
});

Then('the file {string} should contain a platform-ready export bundle', async (relativePath: string) => {
  const filePath = path.join(requireWorkspaceDir(), relativePath);
  const content = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(content) as { readonly contract?: string; readonly version?: number };

  if (parsed.contract !== 'testdata-generator/platform-ready-export' || parsed.version !== 1) {
    throw new Error(`Expected ${relativePath} to contain a platform-ready export bundle, received: ${content}`);
  }
});

Then('the platform-ready bundle file {string} should describe artifact type {string}', async (relativePath: string, artifactType: string) => {
  const filePath = path.join(requireWorkspaceDir(), relativePath);
  const content = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(content) as { readonly artifact?: { readonly type?: string } };

  if (parsed.artifact?.type !== artifactType) {
    throw new Error(`Expected artifact type '${artifactType}' in ${relativePath}, received '${parsed.artifact?.type ?? '<missing>'}'`);
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