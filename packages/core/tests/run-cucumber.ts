import { runCucumber, type IRunOptions } from '@cucumber/cucumber/api';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const featuresPath = path.resolve(__dirname, '../features');

const options: IRunOptions = {
  sources: {
    paths: [
      path.join(featuresPath, 'example.feature'),
      path.join(featuresPath, 'result-pattern.feature'),
      path.join(featuresPath, 'temporal-generators.feature'),
      path.join(featuresPath, 'text-generators.feature'),
      path.join(featuresPath, 'selection-generators.feature'),
      path.join(featuresPath, 'cross-field-templates.feature'),
      path.join(featuresPath, 'uniqueness-constraints.feature'),
      path.join(featuresPath, 'json-context-loader.feature'),
      path.join(featuresPath, 'csv-context-loader.feature'),
      path.join(featuresPath, 'context-reference-resolution.feature'),
      path.join(featuresPath, 'context-tagging-and-selection.feature'),
      path.join(featuresPath, 'generated-context-roundtrip.feature'),
      path.join(featuresPath, 'csv-output-adapter.feature'),
      path.join(featuresPath, 'sql-output-adapter.feature'),
      path.join(featuresPath, 'generateData-public-api.feature'),
      path.join(featuresPath, 'import-resolution.feature'),
      path.join(featuresPath, 'workspace-generators.feature'),
      path.join(featuresPath, 'schema-extension.feature'),
      path.join(featuresPath, 'reference-validation.feature'),
    ],
    order: 'defined',
    defaultDialect: 'en',
    names: [],
    tagExpression: '',
  },
  support: {
    requireModules: [],
    requirePaths: [
      path.join(featuresPath, 'step_definitions/example.steps.ts'),
      path.join(featuresPath, 'step_definitions/result-pattern.steps.ts'),
      path.join(featuresPath, 'step_definitions/temporal-generators.steps.ts'),
      path.join(featuresPath, 'step_definitions/text-generators.steps.ts'),
      path.join(featuresPath, 'step_definitions/selection-generators.steps.ts'),
      path.join(featuresPath, 'step_definitions/cross-field-templates.steps.ts'),
      path.join(featuresPath, 'step_definitions/uniqueness-constraints.steps.ts'),
      path.join(featuresPath, 'step_definitions/json-context-loader.steps.ts'),
      path.join(featuresPath, 'step_definitions/csv-context-loader.steps.ts'),
      path.join(featuresPath, 'step_definitions/context-reference-resolution.steps.ts'),
      path.join(featuresPath, 'step_definitions/context-tagging-and-selection.steps.ts'),
      path.join(featuresPath, 'step_definitions/generated-context-roundtrip.steps.ts'),
      path.join(featuresPath, 'step_definitions/csv-output-adapter.steps.ts'),
      path.join(featuresPath, 'step_definitions/sql-output-adapter.steps.ts'),
      path.join(featuresPath, 'step_definitions/generateData-public-api.steps.ts'),
      path.join(featuresPath, 'step_definitions/import-resolution.steps.ts'),
      path.join(featuresPath, 'step_definitions/workspace-generators.steps.ts'),
      path.join(featuresPath, 'step_definitions/schema-extension.steps.ts'),
      path.join(featuresPath, 'step_definitions/reference-validation.steps.ts'),
      path.join(featuresPath, 'support/**/*.ts'),
    ],
    importPaths: [],
  },
  formats: {
    options: {},
    publish: false,
    stdout: 'progress',
    files: {},
  },
  runtime: {
    parallel: 0,
    dryRun: false,
    failFast: false,
    filterStacktraces: true,
    retry: 0,
    retryTagFilter: '',
    strict: true,
    worldParameters: {},
  },
};

const result = await runCucumber(options, {
  cwd: path.resolve(__dirname, '..'),
  stdout: process.stdout,
  stderr: process.stderr,
  env: process.env,
});

process.exit(result.success ? 0 : 1);
