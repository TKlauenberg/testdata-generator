// Public package-root exports
export { version } from './version';

// Public API - Data Generation
export { generateData, ValidationError } from './generateData';

// Generator (for advanced usage)
export * from './generator';

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

// Context (data loading and saving)
export * from './context';

// History (append-only generation audit log)
export * from './history';
