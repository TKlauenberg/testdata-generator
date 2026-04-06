import { HISTORY_LOG_FILE_NAME, PATTERN_VERSION_STORE_DIRECTORY_NAME } from '@testdata-generator/core';
import * as path from 'node:path';

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

export function normalizeAuditPath(baseDirectory: string, targetPath: string): string {
  const absoluteTargetPath = path.resolve(baseDirectory, targetPath);
  const relativePath = path.relative(baseDirectory, absoluteTargetPath);

  return toPosixPath(relativePath.length > 0 ? relativePath : path.basename(absoluteTargetPath));
}

export function resolveHistoryLogPath(options: {
  readonly currentWorkingDirectory: string;
  readonly historyLogDirectory: string;
  readonly workspaceRoot?: string;
}): string {
  const baseDirectory = options.workspaceRoot ?? options.currentWorkingDirectory;
  return path.join(path.resolve(baseDirectory, options.historyLogDirectory), HISTORY_LOG_FILE_NAME);
}

export function resolvePatternVersionStorePath(options: {
  readonly currentWorkingDirectory: string;
  readonly historyLogDirectory: string;
  readonly workspaceRoot?: string;
}): string {
  const baseDirectory = options.workspaceRoot ?? options.currentWorkingDirectory;
  return path.join(path.resolve(baseDirectory, options.historyLogDirectory), PATTERN_VERSION_STORE_DIRECTORY_NAME);
}