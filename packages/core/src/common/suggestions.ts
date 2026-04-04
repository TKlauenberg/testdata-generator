import * as path from 'node:path';

/**
 * Finds similar strings using Levenshtein distance.
 * Returns up to 3 most similar candidates with distance <= 3.
 */
export function findSimilar(target: string, candidates: readonly string[]): string[] {
  return candidates
    .map((candidate) => ({
      name: candidate,
      distance: levenshteinDistance(target.toLowerCase(), candidate.toLowerCase()),
    }))
    .filter((item) => item.distance <= 3)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map((item) => item.name);
}

/**
 * Normalizes a file-system relative path into import syntax with forward slashes.
 */
export function toImportPath(fromDirectory: string, toFile: string): string {
  const relativePath = path.relative(fromDirectory, toFile).split(path.sep).join('/');
  if (relativePath.startsWith('.')) {
    return relativePath;
  }

  return `./${relativePath}`;
}

/**
 * Calculates Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}