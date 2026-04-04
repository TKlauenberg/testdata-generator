import * as path from 'node:path';

/**
 * Finds similar strings using edit distance with path-aware ranking.
 */
export function findSimilar(target: string, candidates: readonly string[]): string[] {
  const normalizedTarget = normalizeSimilarityInput(target);
  const targetBasename = path.posix.basename(normalizedTarget);
  const targetSegmentCount = countSegments(normalizedTarget);

  return candidates
    .map((candidate) => {
      const normalizedCandidate = normalizeSimilarityInput(candidate);
      const candidateBasename = path.posix.basename(normalizedCandidate);

      return {
      name: candidate,
      distance: levenshteinDistance(normalizedTarget, normalizedCandidate),
      basenameDistance: levenshteinDistance(targetBasename, candidateBasename),
      sharedSuffixSegments: countSharedSuffixSegments(normalizedTarget, normalizedCandidate),
      segmentCountDelta: Math.abs(targetSegmentCount - countSegments(normalizedCandidate)),
      isPathLike: normalizedTarget.includes('/') || normalizedCandidate.includes('/'),
    };
    })
    .filter((item) => (
      item.distance <= 3
      || item.basenameDistance <= 2
      || (item.isPathLike && item.basenameDistance === 0 && item.sharedSuffixSegments > 0)
    ))
    .sort((left, right) => {
      if (left.basenameDistance !== right.basenameDistance) {
        return left.basenameDistance - right.basenameDistance;
      }

      if (left.sharedSuffixSegments !== right.sharedSuffixSegments) {
        return right.sharedSuffixSegments - left.sharedSuffixSegments;
      }

      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }

      if (left.segmentCountDelta !== right.segmentCountDelta) {
        return left.segmentCountDelta - right.segmentCountDelta;
      }

      return left.name.localeCompare(right.name);
    })
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

function normalizeSimilarityInput(value: string): string {
  return value.toLowerCase().replaceAll('\\', '/');
}

function countSegments(value: string): number {
  return value.split('/').filter((segment) => segment.length > 0).length;
}

function countSharedSuffixSegments(left: string, right: string): number {
  const leftSegments = left.split('/').filter((segment) => segment.length > 0);
  const rightSegments = right.split('/').filter((segment) => segment.length > 0);
  let count = 0;

  while (count < leftSegments.length && count < rightSegments.length) {
    const leftSegment = leftSegments[leftSegments.length - 1 - count];
    const rightSegment = rightSegments[rightSegments.length - 1 - count];
    if (leftSegment !== rightSegment) {
      break;
    }

    count += 1;
  }

  return count;
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