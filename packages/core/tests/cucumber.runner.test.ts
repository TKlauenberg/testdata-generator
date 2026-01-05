import { test } from 'bun:test';
import { runCucumber, type IRunOptions } from '@cucumber/cucumber/api';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const featuresPath = path.resolve(__dirname, '../features');

test('Run Cucumber BDD tests with Screenplay pattern', async () => {
  const options: IRunOptions = {
    sources: {
      paths: [path.join(featuresPath, '**/*.feature')],
      order: 'defined',
      defaultDialect: 'en',
      names: [],
      tagExpression: '',
    },
    support: {
      requireModules: [],
      requirePaths: [
        path.join(featuresPath, 'step_definitions/**/*.ts'),
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
      strict: false,
      worldParameters: {},
    },
  };

  const result = await runCucumber(options, {
    cwd: path.resolve(__dirname, '..'),
    stdout: process.stdout,
    stderr: process.stderr,
    env: process.env,
  });

  if (!result.success) {
    throw new Error('Cucumber tests failed');
  }
});
