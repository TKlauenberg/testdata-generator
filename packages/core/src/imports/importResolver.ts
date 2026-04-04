import * as fs from 'node:fs';
import * as path from 'node:path';
import { Scanner } from '../scanner/scanner';
import { Parser } from '../parser/parser';
import type { Diagnostic } from '../common/diagnostic';
import type { Result } from '../common/result';
import type { Declaration, ImportNode, Program } from '../parser/ast';
import { findSimilar, toImportPath } from '../common/suggestions';

export interface ResolveImportsOptions {
  readonly currentFile?: string;
  readonly workspaceRoot?: string;
}

interface ResolverState {
  readonly cache: Map<string, readonly Declaration[]>;
  readonly resolvingStack: string[];
  readonly tdFilesByRoot: Map<string, readonly string[]>;
  readonly workspaceRoot?: string;
}

export function resolveProgramImports(
  program: Program,
  options: ResolveImportsOptions = {},
): Result<Program, Diagnostic[]> {
  if (!program.declarations.some((declaration) => declaration.kind === 'import')) {
    return { ok: true, value: program };
  }

  const currentFile = options.currentFile !== undefined ? path.resolve(options.currentFile) : undefined;
  if (currentFile === undefined) {
    const errors = program.declarations
      .filter((declaration): declaration is ImportNode => declaration.kind === 'import')
      .map((declaration) => createImportDiagnostic(
        declaration,
        `Cannot resolve import '${declaration.path}' without a source file path`,
        'Provide ValidationOptions.currentFile when validating imported schemas',
      ));

    return { ok: false, errors };
  }

  const resolutionResult = resolveDeclarations(program.declarations, currentFile, {
    cache: new Map<string, readonly Declaration[]>(),
    resolvingStack: [currentFile],
    tdFilesByRoot: new Map<string, readonly string[]>(),
    workspaceRoot: options.workspaceRoot !== undefined ? path.resolve(options.workspaceRoot) : undefined,
  });

  if (!resolutionResult.ok) {
    return resolutionResult;
  }

  return {
    ok: true,
    value: {
      ...program,
      declarations: resolutionResult.value,
    },
  };
}

function resolveDeclarations(
  declarations: readonly Declaration[],
  importerFile: string,
  state: ResolverState,
): Result<readonly Declaration[], Diagnostic[]> {
  const mergedDeclarations: Declaration[] = [];
  const errors: Diagnostic[] = [];

  for (const declaration of declarations) {
    if (declaration.kind !== 'import') {
      mergedDeclarations.push(declaration);
      continue;
    }

    const importResult = resolveImportDeclaration(declaration, importerFile, state);
    if (!importResult.ok) {
      errors.push(...importResult.errors);
      continue;
    }

    mergedDeclarations.push(...importResult.value);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: mergedDeclarations };
}

function resolveImportDeclaration(
  declaration: ImportNode,
  importerFile: string,
  state: ResolverState,
): Result<readonly Declaration[], Diagnostic[]> {
  const resolvedPath = resolveImportPath(declaration.path, importerFile, state.workspaceRoot);
  if (!resolvedPath.ok) {
    return {
      ok: false,
      errors: [createImportDiagnostic(declaration, resolvedPath.message, resolvedPath.suggestion)],
    };
  }

  const canonicalPath = canonicalizePath(resolvedPath.value);
  const cycleStartIndex = state.resolvingStack.indexOf(canonicalPath);
  if (cycleStartIndex >= 0) {
    const cyclePath = [...state.resolvingStack.slice(cycleStartIndex), canonicalPath]
      .map((entry) => path.basename(entry))
      .join(' -> ');
    return {
      ok: false,
      errors: [createImportDiagnostic(
        declaration,
        `Circular import detected: ${cyclePath}`,
      )],
    };
  }

  const cachedDeclarations = state.cache.get(canonicalPath);
  if (cachedDeclarations !== undefined) {
    return { ok: true, value: cachedDeclarations };
  }

  let source: string;
  try {
    source = fs.readFileSync(canonicalPath, 'utf-8');
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      const suggestion = suggestMissingImportPath(declaration.path, importerFile, state);
      return {
        ok: false,
        errors: [createImportDiagnostic(
          declaration,
          `Imported file '${declaration.path}' could not be found`,
          suggestion,
        )],
      };
    }

    if (nodeError.code === 'EACCES') {
      return {
        ok: false,
        errors: [createImportDiagnostic(
          declaration,
          `Permission denied while reading imported file '${declaration.path}'`,
        )],
      };
    }

    return {
      ok: false,
      errors: [createImportDiagnostic(
        declaration,
        `Unable to read imported file '${declaration.path}': ${nodeError.message ?? String(error)}`,
      )],
    };
  }

  const scanResult = new Scanner(source, canonicalPath).scan();
  if (!scanResult.ok) {
    return scanResult;
  }

  const parseResult = new Parser(scanResult.value).parse();
  if (!parseResult.ok) {
    return parseResult;
  }

  state.resolvingStack.push(canonicalPath);
  const resolvedDeclarations = resolveDeclarations(parseResult.value.declarations, canonicalPath, state);
  state.resolvingStack.pop();

  if (!resolvedDeclarations.ok) {
    return resolvedDeclarations;
  }

  state.cache.set(canonicalPath, resolvedDeclarations.value);
  return { ok: true, value: resolvedDeclarations.value };
}

function suggestMissingImportPath(
  importPath: string,
  importerFile: string,
  state: ResolverState,
): string | undefined {
  const importerDirectory = path.dirname(importerFile);

  if (importPath.startsWith('@workspace/')) {
    return pickBestSuggestion(importPath, collectWorkspaceImportCandidates(importerFile, state));
  }

  const localSuggestion = pickBestSuggestion(
    importPath,
    collectRelativeImportCandidates(importerDirectory, importerFile, importerDirectory, state),
  );
  if (localSuggestion !== undefined || state.workspaceRoot === undefined) {
    return localSuggestion;
  }

  return pickBestSuggestion(
    importPath,
    collectRelativeImportCandidates(importerDirectory, importerFile, state.workspaceRoot, state),
  );
}

function pickBestSuggestion(
  importPath: string,
  candidateEntries: readonly { readonly display: string }[],
): string | undefined {
  if (candidateEntries.length === 0) {
    return undefined;
  }

  return findSimilar(importPath, candidateEntries.map((candidate) => candidate.display))[0];
}

function collectRelativeImportCandidates(
  importerDirectory: string,
  importerFile: string,
  searchRoot: string,
  state: ResolverState,
): Array<{ readonly display: string }> {
  const suggestions = new Set<string>();
  for (const filePath of getTdFiles(searchRoot, state)) {
    if (isSameFilePath(filePath, importerFile)) {
      continue;
    }

    suggestions.add(toImportPath(importerDirectory, filePath));
  }

  return Array.from(suggestions).map((display) => ({ display }));
}

function collectWorkspaceImportCandidates(
  importerFile: string,
  state: ResolverState,
): Array<{ readonly display: string }> {
  const { workspaceRoot } = state;
  if (workspaceRoot === undefined) {
    return [];
  }

  return getTdFiles(workspaceRoot, state)
    .filter((filePath) => !isSameFilePath(filePath, importerFile))
    .map((filePath) => ({
      display: `@workspace/${path.relative(workspaceRoot, filePath).split(path.sep).join('/')}`,
    }));
}

function getTdFiles(root: string, state: ResolverState): readonly string[] {
  const normalizedRoot = path.resolve(root);
  const cached = state.tdFilesByRoot.get(normalizedRoot);
  if (cached !== undefined) {
    return cached;
  }

  const files = collectTdFiles(normalizedRoot);
  state.tdFilesByRoot.set(normalizedRoot, files);
  return files;
}

function isSameFilePath(left: string, right: string): boolean {
  return path.resolve(left) === path.resolve(right);
}

function collectTdFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }

  const stack = [root];
  const files: string[] = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      continue;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name));
    } catch {
      continue;
    }

    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }

      if (entry.name === 'node_modules' || entry.name.startsWith('.git')) {
        continue;
      }

      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.td')) {
        files.push(entryPath);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function resolveImportPath(
  importPath: string,
  importerFile: string,
  workspaceRoot?: string,
):
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string; readonly suggestion?: string } {
  if (importPath.startsWith('@workspace/')) {
    if (workspaceRoot === undefined) {
      return {
        ok: false,
        message: `Cannot resolve workspace import '${importPath}' because no workspace root could be determined`,
        suggestion: 'Validate this file through a workspace-aware entry point or provide ValidationOptions.workspaceRoot',
      };
    }

    const workspaceRelativePath = importPath.slice('@workspace/'.length);
    return {
      ok: true,
      value: path.resolve(workspaceRoot, workspaceRelativePath),
    };
  }

  return {
    ok: true,
    value: path.resolve(path.dirname(importerFile), importPath),
  };
}

function canonicalizePath(filePath: string): string {
  const absolutePath = path.resolve(filePath);

  try {
    return fs.realpathSync(absolutePath);
  } catch {
    return path.normalize(absolutePath);
  }
}

function createImportDiagnostic(
  declaration: ImportNode,
  message: string,
  suggestion?: string,
): Diagnostic {
  return {
    code: message.includes('Circular import') ? 'analyzer.circularDependency' : 'analyzer.unresolvedImport',
    message,
    severity: 'error',
    location: declaration.location,
    suggestion,
  };
}