/**
 * Generate Command Implementation
 *
 * Implements the `td generate` command for generating test data from DSL schemas.
 *
 * @module commands/generate
 */

import { Command } from 'commander';
import {
  appendGenerationHistoryEntry,
  createGenerationHistoryEntry,
  createGenerationMetadata,
  CsvAdapter,
  generate,
  JsonAdapter,
  saveAsContext,
  SqlAdapter,
  validateSchema,
  ValidationError,
} from '@testdata-ai/core';
import type {
  AdapterMetadata,
  Diagnostic,
  GenerateOptions,
  GenerationMetadataLineageInput,
  ValidatedProgram,
  WorkspaceGeneratorSpec,
} from '@testdata-ai/core';
import * as fs from 'fs/promises';
import * as os from 'node:os';
import * as path from 'path';
import {
  BUILT_IN_CLI_CONFIG,
  CliConfigError,
  loadEffectiveConfig,
  validateOutputFormat,
} from '../config';
import type { CliOutputFormat } from '../config';
import { formatErrors } from '../formatters';
import { normalizeAuditPath, resolveHistoryLogPath } from '../historySupport';

/**
 * Progress display threshold - show progress for datasets larger than this.
 */
const PROGRESS_THRESHOLD = 100;
const ANSI_ESCAPE_PATTERN = new RegExp(String.raw`\u001B\[[0-9;]*m`, 'g');

/**
 * Type guard to check if an error is a Node.js errno exception.
 */
function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

class GenerateCommandFailure extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number) {
    super(message);
    this.name = 'GenerateCommandFailure';
    this.exitCode = exitCode;
  }
}

interface BuildGenerationMetadataOptions {
  readonly absoluteFile: string;
  readonly count: number;
  readonly format: CliOutputFormat;
  readonly seed?: number;
  readonly source: string;
  readonly validatedProgram: ValidatedProgram;
  readonly workingDirectory: string;
  readonly workspaceGenerators: readonly WorkspaceGeneratorSpec[];
}

interface BuildKnownGenerationMetadataOptions {
  readonly absoluteFile: string;
  readonly count: number;
  readonly format: CliOutputFormat;
  readonly seed?: number;
  readonly workingDirectory: string;
}

interface AppendHistoryOptions {
  readonly enabled: boolean;
  readonly historyPath: string;
  readonly metadata: AdapterMetadata;
  readonly status: 'success' | 'failure';
  readonly durationMs: number;
  readonly recordCount: number;
  readonly errorMessage?: string;
  readonly outputPath?: string;
  readonly savedContextName?: string;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

function serializeDeterministically(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeDeterministically(entry)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${serializeDeterministically(entryValue)}`);

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(Object.prototype.toString.call(value));
}

function toLineageIdentifier(workingDirectory: string, filePath: string): string {
  const relativePath = path.relative(workingDirectory, filePath);
  return toPosixPath(relativePath.length > 0 ? relativePath : path.basename(filePath));
}

async function buildGenerationMetadata(options: BuildGenerationMetadataOptions): Promise<AdapterMetadata> {
  const lineageInputs: GenerationMetadataLineageInput[] = [
    {
      type: 'root-pattern',
      identifier: toLineageIdentifier(options.workingDirectory, options.absoluteFile),
      content: options.source,
    },
  ];

  const importedFiles = Array.from(new Set(
    options.validatedProgram.ast.declarations
      .map((declaration) => path.resolve(declaration.location.file))
      .filter((filePath) => filePath !== path.resolve(options.absoluteFile)),
  )).sort((left, right) => left.localeCompare(right));

  for (const importedFile of importedFiles) {
    const importedSource = await fs.readFile(importedFile, 'utf-8');
    lineageInputs.push({
      type: 'imported-pattern',
      identifier: toLineageIdentifier(options.workingDirectory, importedFile),
      content: importedSource,
    });
  }

  for (const generator of [...options.workspaceGenerators].sort((left, right) => left.name.localeCompare(right.name))) {
    lineageInputs.push({
      type: 'workspace-generator',
      identifier: generator.name,
      content: serializeDeterministically(generator.definition),
    });
  }

  return createGenerationMetadata({
    sourcePattern: toLineageIdentifier(options.workingDirectory, options.absoluteFile),
    count: options.count,
    format: options.format,
    seed: options.seed,
    lineageInputs,
  });
}

function buildKnownGenerationMetadata(options: BuildKnownGenerationMetadataOptions): AdapterMetadata {
  return createGenerationMetadata({
    sourcePattern: toLineageIdentifier(options.workingDirectory, options.absoluteFile),
    count: options.count,
    format: options.format,
    seed: options.seed,
  });
}

function stripAnsi(value: string): string {
  return value.replace(ANSI_ESCAPE_PATTERN, '');
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return stripAnsi(error.message).split(/\r?\n/)[0] ?? error.message;
  }

  return stripAnsi(String(error)).split(/\r?\n/)[0] ?? String(error);
}

function summarizeValidationError(error: ValidationError): string {
  const messages = error.diagnostics.map((diagnostic) => diagnostic.message.trim()).filter((message) => message.length > 0);

  if (messages.length === 0) {
    return 'Validation failed';
  }

  return `Validation failed: ${messages.join(' | ')}`;
}

function buildSourceReadErrorMessage(file: string, error: unknown): string {
  if (isNodeError(error)) {
    if (error.code === 'ENOENT') {
      return `File '${file}' not found`;
    }

    if (error.code === 'EACCES') {
      return `Permission denied reading '${file}'`;
    }

    return `Error reading file: ${error.message}`;
  }

  return `Error reading file: ${String(error)}`;
}

function calculateRecordsPerSecond(recordCount: number, durationMs: number): number {
  if (recordCount <= 0 || durationMs <= 0) {
    return 0;
  }

  return recordCount / (durationMs / 1000);
}

async function appendHistoryRecord(options: AppendHistoryOptions): Promise<void> {
  if (!options.enabled) {
    return;
  }

  await appendGenerationHistoryEntry(
    options.historyPath,
    createGenerationHistoryEntry({
      metadata: options.metadata,
      status: options.status,
      errorMessage: options.errorMessage,
      durationMs: options.durationMs,
      recordsPerSecond: calculateRecordsPerSecond(options.recordCount, options.durationMs),
      outputPath: options.outputPath,
      savedContextName: options.savedContextName,
    }),
  );
}

async function tryAppendFailureHistoryRecord(options: AppendHistoryOptions): Promise<void> {
  try {
    await appendHistoryRecord(options);
  } catch (error: unknown) {
    process.stderr.write(`History logging failed: ${normalizeErrorMessage(error)}\n`);
  }
}

/**
 * Generate command for creating test data from DSL schemas.
 *
 * Usage:
 *   td generate <file.td>
 *   td generate schema.td --count 100
 *   td generate schema.td --seed 12345 -o output.json
 */
export const generateCommand = new Command('generate')
  .description('Generate test data from DSL schema')
  .argument('<file>', 'DSL schema file (.td)')
  .option(
    '-c, --count <number>',
    `Number of records to generate (default: workspace config, global config, or built-in ${BUILT_IN_CLI_CONFIG.defaults.count})`,
  )
  .option(
    '-f, --format <format>',
    `Output format (default: workspace config, global config, or built-in ${BUILT_IN_CLI_CONFIG.defaults.format})`,
  )
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('-s, --seed <number>', 'Random seed for reproducibility')
  .option('--table-name <name>', 'SQL table name (sql output only)')
  .option('--save-context <name>', 'Save generated records as reusable context')
  .option('--no-history', 'Disable generation history logging for this invocation')
  .option(
    '--save-context-dir <directory>',
    `Directory for saved context files (default: workspace config, global config, or built-in ${BUILT_IN_CLI_CONFIG.context.saveDirectory})`,
  )
  .action(async (file: string, options: CommandOptions) => {
    try {
      const absoluteFile = path.resolve(file);
      const sourceDirectory = path.dirname(absoluteFile);
      const workingDirectory = process.cwd();
      let cliConfig = BUILT_IN_CLI_CONFIG;
      let workspaceRoot: string | undefined;
      try {
        const loadedConfig = await loadEffectiveConfig({ currentDirectory: sourceDirectory });
        cliConfig = loadedConfig.config;
        workspaceRoot = loadedConfig.layers.workspace !== undefined
          ? path.dirname(loadedConfig.layers.workspace.path)
          : undefined;
      } catch (error: unknown) {
        if (error instanceof CliConfigError) {
          console.error(`Error: ${error.message}`);
          process.exit(error.exitCode);
        }

        throw error;
      }

      // Parse options
      const count = parsePositiveIntegerOption(
        options.count ?? String(cliConfig.defaults.count),
        '--count',
      );
      const format = resolveOutputFormat({
        explicitFormat: options.format,
        outputPath: options.output,
        configFormat: cliConfig.defaults.format,
      });
      const historyEnabled = options.history !== false;
      const historyPath = resolveHistoryLogPath({
        currentWorkingDirectory: workingDirectory,
        historyLogDirectory: cliConfig.history.logDirectory,
        workspaceRoot,
      });
      const historyOutputPath = options.output === undefined
        ? undefined
        : normalizeAuditPath(workingDirectory, options.output);
      const seed = options.seed ? parseIntegerOption(options.seed, '--seed') : undefined;
      const startTime = performance.now();
      let historyMetadata = buildKnownGenerationMetadata({
        absoluteFile,
        count,
        format,
        seed,
        workingDirectory,
      });

      if (options.tableName !== undefined && format !== 'sql') {
        const errorMessage = '--table-name can only be used when the effective output format is sql';

        await tryAppendFailureHistoryRecord({
          enabled: historyEnabled,
          historyPath,
          metadata: historyMetadata,
          status: 'failure',
          durationMs: performance.now() - startTime,
          recordCount: 0,
          errorMessage,
          outputPath: historyOutputPath,
          savedContextName: options.saveContext,
        });

        process.stderr.write(`Error: ${errorMessage}\n`);
        process.exitCode = 1;
        return;
      }

      const sqlTableName = format === 'sql'
        ? resolveSqlTableName({
          explicitTableName: options.tableName,
          outputPath: options.output,
          schemaPath: file,
        })
        : undefined;

      const saveContextDirectory = options.saveContextDir ?? cliConfig.context.saveDirectory;

      // Step 1: Read file
      let source = '';
      try {
        source = await fs.readFile(absoluteFile, 'utf-8');
      } catch (err: unknown) {
        const errorMessage = buildSourceReadErrorMessage(file, err);

        await tryAppendFailureHistoryRecord({
          enabled: historyEnabled,
          historyPath,
          metadata: historyMetadata,
          status: 'failure',
          durationMs: performance.now() - startTime,
          recordCount: 0,
          errorMessage,
          outputPath: historyOutputPath,
          savedContextName: options.saveContext,
        });

        console.error(errorMessage.startsWith('Error reading file:') ? errorMessage : `Error: ${errorMessage}`);
        process.exit(3);
        throw new Error('Unreachable');
      }

      // Step 2: Validate and generate
      const records: Array<Record<string, unknown>> = [];

      const genOptions: GenerateOptions = {
        count,
        seed,
      };

      try {
        const validationResult = validateSchema(source, absoluteFile, {
          defaultGenerators: cliConfig.generatorDefaults,
          workspaceGenerators: cliConfig.generators,
          currentFile: absoluteFile,
          workspaceRoot,
        });

        if (!validationResult.ok) {
          throw new ValidationError(validationResult.errors);
        }

        const metadata = await buildGenerationMetadata({
          absoluteFile,
          count,
          format,
          seed,
          source,
          validatedProgram: validationResult.value,
          workingDirectory,
          workspaceGenerators: cliConfig.generators,
        });
        historyMetadata = metadata;

        // Show progress for large datasets
        let recordCount = 0;
        const showProgress = count > PROGRESS_THRESHOLD;

        for await (const record of generate(validationResult.value, genOptions)) {
          records.push(record);
          recordCount++;

          // Update progress every 100 records or 10% (whichever is more frequent)
          if (showProgress && (recordCount % 100 === 0 || recordCount % Math.ceil(count / 10) === 0)) {
            const percentage = Math.floor((recordCount / count) * 100);
            process.stderr.write(`\rGenerating... ${recordCount}/${count} (${percentage}%)`);
          }
        }

        // Clear progress line
        if (showProgress) {
          process.stderr.write('\r\x1b[K'); // Clear line
        }

        const endTime = performance.now();
        const durationMs = endTime - startTime;
        const duration = (durationMs / 1000).toFixed(1);

        // Step 3: Format output
        try {
          const stdoutOutput = await writeFormattedOutput({
            records,
            format,
            metadata,
            outputPath: options.output,
            sqlTableName,
          });

          if (stdoutOutput !== undefined) {
            process.stdout.write(stdoutOutput);
          }
        } catch (err: unknown) {
          throw new GenerateCommandFailure(`Error writing output file: ${normalizeErrorMessage(err)}`, 3);
        }

        if (options.saveContext) {
          try {
            const contextDirectory = path.resolve(workingDirectory, saveContextDirectory);

            await saveAsContext(records, options.saveContext, [], {
              directory: contextDirectory,
              timestamp: metadata.timestamp,
              sourcePattern: metadata.sourcePattern,
              version: metadata.version,
              seed: metadata.seed,
              patternHash: metadata.patternHash,
              lineage: metadata.lineage,
            });
          } catch (err: unknown) {
            throw new GenerateCommandFailure(`Error saving context file: ${normalizeErrorMessage(err)}`, 3);
          }
        }

        try {
          await appendHistoryRecord({
            enabled: historyEnabled,
            historyPath,
            metadata,
            status: 'success',
            durationMs,
            recordCount: records.length,
            outputPath: historyOutputPath,
            savedContextName: options.saveContext,
          });
        } catch (error: unknown) {
          throw new GenerateCommandFailure(`Error writing history file: ${normalizeErrorMessage(error)}`, 3);
        }

        // Step 5: Display summary
        console.error(`Generated ${records.length} records in ${duration}s`);

        process.exit(0);
      } catch (err: unknown) {
        const durationMs = performance.now() - startTime;

        if (err instanceof ValidationError) {
          await tryAppendFailureHistoryRecord({
            enabled: historyEnabled,
            historyPath,
            metadata: historyMetadata,
            status: 'failure',
            durationMs,
            recordCount: records.length,
            errorMessage: summarizeValidationError(err),
            outputPath: historyOutputPath,
            savedContextName: options.saveContext,
          });

          // Validation error - display diagnostics
          console.error('Validation failed:\n');
          displayDiagnostics(err.diagnostics, source);
          process.exit(1);
        } else if (err instanceof GenerateCommandFailure) {
          await tryAppendFailureHistoryRecord({
            enabled: historyEnabled,
            historyPath,
            metadata: historyMetadata,
            status: 'failure',
            durationMs,
            recordCount: records.length,
            errorMessage: err.message,
            outputPath: historyOutputPath,
            savedContextName: options.saveContext,
          });

          console.error(err.message);
          process.exit(err.exitCode);
        } else {
          const message = normalizeErrorMessage(err);
          await tryAppendFailureHistoryRecord({
            enabled: historyEnabled,
            historyPath,
            metadata: historyMetadata,
            status: 'failure',
            durationMs,
            recordCount: records.length,
            errorMessage: message,
            outputPath: historyOutputPath,
            savedContextName: options.saveContext,
          });

          // Generation error (should be rare)
          console.error(`Error during generation: ${message}`);
          process.exit(2);
        }
      }
    } catch (err: unknown) {
      // Unexpected error
      const error = err as Error;
      console.error(`Unexpected error: ${error.message}`);
      process.exit(2);
    }
  });

/**
 * Display diagnostic messages in a readable format using Rust-style formatting.
 *
 * @param diagnostics - Array of diagnostic messages from validation
 * @param source - Source code for context display
 */
function displayDiagnostics(diagnostics: Diagnostic[], source: string): void {
  // Use new Rust-style error formatter
  const formatted = formatErrors(diagnostics, source);
  console.error(formatted);

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  if (errorCount > 0) {
    console.error(`\nValidation failed with ${errorCount} error(s) and ${warningCount} warning(s)`);
  }
}

/**
 * Command options from Commander.js
 */
interface CommandOptions {
  count?: string;
  format?: string;
  history?: boolean;
  output?: string;
  seed?: string;
  tableName?: string;
  saveContext?: string;
  saveContextDir?: string;
}

interface ResolveOutputFormatOptions {
  readonly explicitFormat?: string;
  readonly outputPath?: string;
  readonly configFormat: CliOutputFormat;
}

interface ResolveSqlTableNameOptions {
  readonly explicitTableName?: string;
  readonly outputPath?: string;
  readonly schemaPath: string;
}

interface WriteFormattedOutputOptions {
  readonly records: readonly Record<string, unknown>[];
  readonly format: CliOutputFormat;
  readonly metadata: AdapterMetadata;
  readonly outputPath?: string;
  readonly sqlTableName?: string;
}

function parsePositiveIntegerOption(rawValue: string, optionName: string): number {
  const value = parseIntegerOption(rawValue, optionName);

  if (value <= 0) {
    console.error(`Error: ${optionName} must be a positive integer`);
    process.exit(1);
  }

  return value;
}

function parseIntegerOption(rawValue: string, optionName: string): number {
  const normalized = rawValue.trim();
  if (!/^[+-]?\d+$/.test(normalized)) {
    console.error(`Error: ${optionName} must be an integer`);
    process.exit(1);
  }

  const value = Number.parseInt(normalized, 10);

  return value;
}

function resolveOutputFormat(options: ResolveOutputFormatOptions): CliOutputFormat {
  if (options.explicitFormat !== undefined) {
    return validateOutputFormat(options.explicitFormat, '--format');
  }

  return inferOutputFormat(options.outputPath) ?? options.configFormat;
}

function inferOutputFormat(outputPath?: string): CliOutputFormat | undefined {
  if (outputPath === undefined) {
    return undefined;
  }

  const extension = path.extname(outputPath).toLowerCase();
  if (extension === '.json') {
    return 'json';
  }

  if (extension === '.csv') {
    return 'csv';
  }

  if (extension === '.sql') {
    return 'sql';
  }

  return undefined;
}

function resolveSqlTableName(options: ResolveSqlTableNameOptions): string {
  if (options.explicitTableName !== undefined) {
    return options.explicitTableName;
  }

  if (options.outputPath !== undefined) {
    return path.parse(options.outputPath).name;
  }

  return path.parse(options.schemaPath).name;
}

async function writeFormattedOutput(options: WriteFormattedOutputOptions): Promise<string | undefined> {
  if (options.outputPath !== undefined) {
    const outputDirectory = path.dirname(options.outputPath);
    await fs.mkdir(outputDirectory, { recursive: true });

    await writeAdapterOutput({
      records: options.records,
      format: options.format,
      metadata: options.metadata,
      outputPath: options.outputPath,
      sqlTableName: options.sqlTableName,
    });
    return undefined;
  }

  return renderAdapterOutputToString({
    records: options.records,
    format: options.format,
    metadata: options.metadata,
    outputPath: options.outputPath,
    sqlTableName: options.sqlTableName,
  });
}

async function renderAdapterOutputToString(options: {
  readonly records: readonly Record<string, unknown>[];
  readonly format: CliOutputFormat;
  readonly metadata: AdapterMetadata;
  readonly outputPath?: string;
  readonly sqlTableName?: string;
}): Promise<string> {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'testdata-ai-cli-output-'));
  const tempOutputPath = path.join(tempDirectory, `output.${options.format}`);

  try {
    await writeAdapterOutput({
      records: options.records,
      format: options.format,
      metadata: options.metadata,
      outputPath: tempOutputPath,
      sqlTableName: options.sqlTableName,
    });

    return await fs.readFile(tempOutputPath, 'utf-8');
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

async function writeAdapterOutput(options: {
  readonly records: readonly Record<string, unknown>[];
  readonly format: CliOutputFormat;
  readonly metadata: AdapterMetadata;
  readonly outputPath: string;
  readonly sqlTableName?: string;
}): Promise<void> {
  if (options.format === 'json') {
    const adapter = new JsonAdapter({
      outputPath: options.outputPath,
      format: 'array',
      metadata: options.metadata,
    });
    await adapter.write(createRecordStream(options.records));
    return;
  }

  if (options.format === 'csv') {
    const adapter = new CsvAdapter({ outputPath: options.outputPath, metadata: options.metadata });
    await adapter.write(createRecordStream(options.records));
    return;
  }

  const adapter = new SqlAdapter({
    outputPath: options.outputPath,
    tableName: options.sqlTableName ?? 'generated_records',
    metadata: options.metadata,
  });
  await adapter.write(createRecordStream(options.records));
}

function createRecordStream(
  records: readonly Record<string, unknown>[],
): AsyncIterable<Record<string, unknown>> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<Record<string, unknown>> {
      let index = 0;

      return {
        next(): Promise<IteratorResult<Record<string, unknown>>> {
          const record = records[index];
          if (record === undefined) {
            return Promise.resolve({ done: true, value: undefined });
          }

          index += 1;
          return Promise.resolve({ done: false, value: record });
        },
      };
    },
  };
}
