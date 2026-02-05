// Public API exports - will be expanded in future stories
export const version = '0.1.0';

// Validation (end-to-end pipeline)
export { validateSchema } from './validate';

// Common utilities
export * from './common';

// Scanner (lexical analysis)
export * from './scanner';

// Parser (syntax analysis)
export * from './parser';

// Analyzer (semantic analysis)
export * from './analyzer';

// Adapters (output formatting)
export * from './adapters';
