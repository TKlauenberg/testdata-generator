import { runCucumber, type IRunOptions } from '@cucumber/cucumber/api';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const featuresPath = path.resolve(__dirname, '../features');

const options: IRunOptions = {
  sources: {
    paths: [
      path.join(featuresPath, 'generateCommand.feature'),
      path.join(featuresPath, 'historyCommand.feature'),
      path.join(featuresPath, 'saveGeneratedContext.feature'),
    ],
    order: 'defined',
    defaultDialect: 'en',
    names: [],
    tagExpression: '',
  },
  support: {
    requireModules: [],
    requirePaths: [
      path.join(featuresPath, 'step_definitions/generateCommand.steps.ts'),
      path.join(featuresPath, 'step_definitions/history.steps.ts'),
      path.join(featuresPath, 'step_definitions/saveGeneratedContext.steps.ts'),
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
