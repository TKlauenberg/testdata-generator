import type { Diagnostic } from '@testdata-ai/core';
import chalk from 'chalk';

/**
 * Format a single diagnostic with Rust-style error display
 */
export function formatError(diagnostic: Diagnostic, sourceContent: string): string {
  const { code, message, severity, location, suggestion } = diagnostic;

  // Determine label and color based on severity
  const label = severity === 'error' ? 'Error' : severity === 'warning' ? 'Warning' : 'Info';
  const errorColor = severity === 'error' ? chalk.red : severity === 'warning' ? chalk.yellow : chalk.blue;

  // Start with error header (colored)
  let output = errorColor.bold(`${label}: ${code}`) + '\n';

  // Add location information if available
  if (location) {
    // Location line: --> file.td:5:15 (blue)
    output += chalk.blue(`  --> ${location.file}:${location.line}:${location.column}`) + '\n';
    output += chalk.blue('   |') + '\n';

    // Extract and display source line
    const lineContent = _getSourceLine(sourceContent, location.line);
    if (lineContent !== null) {
      const lineNum = location.line.toString().padStart(2, ' ');
      output += chalk.blue(` ${lineNum} | `) + lineContent + '\n';

      // Generate visual pointer (colored)
      const pointer = _generatePointer(location.column, location.length);
      output += chalk.blue('   | ') + errorColor(pointer) + ' ' + errorColor(message) + '\n';
    } else {
      // Line not found in source, just show message
      output += chalk.blue('   | ') + errorColor(message) + '\n';
    }

    output += chalk.blue('   |') + '\n';

    // Add suggestion if present
    if (suggestion) {
      output += chalk.blue('   = ') + chalk.cyan(`help: ${suggestion}`) + '\n';
    }
  } else {
    // No location - just show message
    output += `  ${message}\n`;
    if (suggestion) {
      output += `  help: ${suggestion}\n`;
    }
  }

  return output;
}

/**
 * Format multiple diagnostics, grouped by file and sorted by location
 */
export function formatErrors(diagnostics: Diagnostic[], sourceContent: string): string {
  if (diagnostics.length === 0) {
    return '';
  }

  // Group diagnostics by file
  const byFile = new Map<string, Diagnostic[]>();
  for (const diag of diagnostics) {
    const file = diag.location?.file ?? 'unknown';
    if (!byFile.has(file)) {
      byFile.set(file, []);
    }
    const fileArray = byFile.get(file);
    if (fileArray) {
      fileArray.push(diag);
    }
  }

  // Sort each group by line and column
  for (const diags of byFile.values()) {
    diags.sort((a, b) => {
      const locA = a.location;
      const locB = b.location;

      // Handle diagnostics without locations
      if (!locA && !locB) return 0;
      if (!locA) return 1;
      if (!locB) return -1;

      // Sort by line first
      if (locA.line !== locB.line) {
        return locA.line - locB.line;
      }

      // Then by column
      return locA.column - locB.column;
    });
  }

  // Format all errors
  const outputs: string[] = [];
  for (const diags of byFile.values()) {
    for (const diag of diags) {
      outputs.push(formatError(diag, sourceContent));
    }
  }

  return outputs.join('\n');
}

/**
 * Extract a specific line from source content (1-indexed)
 * @returns The line content, or null if line doesn't exist
 */
function _getSourceLine(source: string, lineNumber: number): string | null {
  const lines = source.split('\n');
  const index = lineNumber - 1; // Convert to 0-indexed

  if (index >= 0 && index < lines.length) {
    const line = lines[index];
    // Handle terminal width - truncate very long lines
    const maxWidth = process.stdout.columns || 80;
    if (line.length > maxWidth - 10) {
      // Leave room for line number prefix
      return line.substring(0, maxWidth - 13) + '...';
    }
    return line;
  }

  return null;
}

/**
 * Generate visual pointer (^) aligned to error location
 * @param column 1-indexed column position
 * @param length Number of characters to underline (minimum 1)
 */
function _generatePointer(column: number, length: number): string {
  const spaces = ' '.repeat(Math.max(0, column - 1)); // Convert to 0-indexed
  const carets = '^'.repeat(Math.max(1, length)); // At least one caret
  return spaces + carets;
}
