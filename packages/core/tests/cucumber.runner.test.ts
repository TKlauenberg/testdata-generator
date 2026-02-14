import { test } from 'bun:test';
import { spawn } from 'bun';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runnerPath = path.resolve(__dirname, './run-cucumber.ts');

test(
  'Run Cucumber BDD tests with Screenplay pattern',
  async () => {
    const proc = spawn(['bun', runnerPath], {
      cwd: path.resolve(__dirname, '..'),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    if (exitCode !== 0) {
      throw new Error(`Cucumber tests failed\n${stdout}\n${stderr}`);
    }
  },
  { timeout: 30000 },
);
