#!/usr/bin/env bun
/**
 * Validates that all TypeScript files follow camelCase naming convention
 * as specified in the project architecture.
 *
 * Usage: bun scripts/validate-file-naming.ts
 */

import { readdirSync, statSync } from 'fs';
import { join, relative, basename } from 'path';

const PROJECT_ROOT = process.cwd();
const PACKAGES_DIR = join(PROJECT_ROOT, 'packages');

// Directories to ignore
const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  '.github',
  '.vscode',
]);

// Directories where PascalCase is allowed (Screenplay pattern)
const PASCALCASE_ALLOWED_DIRS = new Set(['abilities', 'tasks', 'questions', 'screenplay']);

// Files that are allowed to use PascalCase or other formats
const ALLOWED_EXCEPTIONS = new Set([
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'tsconfig.json',
  'package.json',
]);

interface ValidationError {
  file: string;
  reason: string;
}

/**
 * Recursively walks directory and collects all TypeScript files
 */
function walkDirectory(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.has(entry)) {
        walkDirectory(fullPath, files);
      }
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Validates a single file name against camelCase convention
 */
function validateFileName(filePath: string): ValidationError | null {
  const fileName = basename(filePath);
  const dirName = basename(join(filePath, '..'));

  // Skip allowed exceptions
  if (ALLOWED_EXCEPTIONS.has(fileName)) {
    return null;
  }

  // Allow PascalCase in Screenplay pattern directories
  if (PASCALCASE_ALLOWED_DIRS.has(dirName)) {
    return null;
  }

  // Extract name without extension
  const nameWithoutExt = fileName.replace(/\.(ts|tsx)$/, '');

  // Allow test files, config files, and type definition files
  if (
    nameWithoutExt.endsWith('.test') ||
    nameWithoutExt.endsWith('.spec') ||
    nameWithoutExt.endsWith('.config') ||
    nameWithoutExt.endsWith('.d')
  ) {
    return null;
  }

  // Check if starts with uppercase (PascalCase violation)
  if (/^[A-Z]/.test(nameWithoutExt)) {
    return {
      file: relative(PROJECT_ROOT, filePath),
      reason: `File name should use camelCase, not PascalCase (starts with '${nameWithoutExt[0]}')`,
    };
  }

  // Check if contains uppercase letters (not camelCase)
  if (/[A-Z]/.test(nameWithoutExt) && !/^[a-z][a-zA-Z0-9]*$/.test(nameWithoutExt)) {
    return {
      file: relative(PROJECT_ROOT, filePath),
      reason: `File name should use camelCase format (found: '${nameWithoutExt}')`,
    };
  }

  return null;
}

/**
 * Main validation logic
 */
function main(): void {
  // eslint-disable-next-line no-console
  console.log('🔍 Validating TypeScript file naming conventions...\n');

  const files = walkDirectory(PACKAGES_DIR);
  const errors: ValidationError[] = [];

  for (const file of files) {
    const error = validateFileName(file);
    if (error) {
      errors.push(error);
    }
  }

  if (errors.length === 0) {
    // eslint-disable-next-line no-console
    console.log('✅ All TypeScript files follow camelCase naming convention!');
    // eslint-disable-next-line no-console
    console.log(`   Checked ${files.length} files.\n`);
    process.exit(0);
  } else {
    // eslint-disable-next-line no-console
    console.log(`❌ Found ${errors.length} file naming violations:\n`);
    for (const error of errors) {
      // eslint-disable-next-line no-console
      console.log(`  ${error.file}`);
      // eslint-disable-next-line no-console
      console.log(`    → ${error.reason}\n`);
    }
    // eslint-disable-next-line no-console
    console.log(`Please rename these files to follow camelCase convention.`);
    // eslint-disable-next-line no-console
    console.log(`Example: Scanner.ts → scanner.ts\n`);
    process.exit(1);
  }
}

main();
