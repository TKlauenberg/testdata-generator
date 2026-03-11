import { Command } from 'commander';
import { CliConfigError, getSettingSources, loadEffectiveConfig } from '../config/index.js';
import type { CliConfigSource, LoadedEffectiveCliConfig } from '../config/index.js';

function sourceLabel(source: CliConfigSource): string {
  return `[${source}]`;
}

function configFileLine(label: string, filePath: string, found: boolean): string {
  const status = found ? '' : '(not found — using built-in defaults)';
  return `  ${label.padEnd(10)} ${filePath}  ${status}`.trimEnd();
}

function generatorDefaultsDisplay(effective: LoadedEffectiveCliConfig): string {
  const specs = effective.config.generatorDefaults;
  if (specs.length === 0) return '(none)';
  return specs.map((s) => `${s.fieldType}: ${s.generator.name}`).join(', ');
}

async function runConfigShow(): Promise<void> {
  const effective = await loadEffectiveConfig();
  const sources = getSettingSources(effective);

  // eslint-disable-next-line no-console -- User-facing config display output
  console.log('Effective Configuration');
  // eslint-disable-next-line no-console -- User-facing config display output
  console.log('═══════════════════════');
  // eslint-disable-next-line no-console -- User-facing config display output
  console.log('');
  // eslint-disable-next-line no-console -- User-facing config display output
  console.log('Layer priority:  field-level  >  schema-level  >  workspace  >  global  >  built-in');
  // eslint-disable-next-line no-console -- User-facing config display output
  console.log('');
  // eslint-disable-next-line no-console -- User-facing config display output
  console.log('Config files:');
  // eslint-disable-next-line no-console -- User-facing config display output
  console.log(
    configFileLine('global', effective.layers.global.path, effective.layers.global.source === 'global'),
  );
  if (effective.layers.workspace !== undefined) {
    // eslint-disable-next-line no-console -- User-facing config display output
    console.log(configFileLine('workspace', effective.layers.workspace.path, true));
  } else {
    // eslint-disable-next-line no-console -- User-facing config display output
    console.log('  workspace  (not found)');
  }
  // eslint-disable-next-line no-console -- User-facing config display output
  console.log('');
  // eslint-disable-next-line no-console -- User-facing config display output
  console.log('Settings:');
  // eslint-disable-next-line no-console -- User-facing config display output
  console.log(
    `  defaults.count        ${String(effective.config.defaults.count).padEnd(12)} ${sourceLabel(sources.defaults)}`,
  );
  // eslint-disable-next-line no-console -- User-facing config display output
  console.log(
    `  defaults.format       ${effective.config.defaults.format.padEnd(12)} ${sourceLabel(sources.defaults)}`,
  );
  // eslint-disable-next-line no-console -- User-facing config display output
  console.log(
    `  context.saveDirectory ${effective.config.context.saveDirectory.padEnd(12)} ${sourceLabel(sources.context)}`,
  );
  // eslint-disable-next-line no-console -- User-facing config display output
  console.log(
    `  generatorDefaults     ${generatorDefaultsDisplay(effective).padEnd(12)} ${sourceLabel(sources.generatorDefaults)}`,
  );
}

export const configCommand = new Command('config')
  .description('Manage testdata-ai configuration')
  .addCommand(
    new Command('show')
      .description('Show effective configuration with source of each setting')
      .action(async () => {
        try {
          await runConfigShow();
        } catch (error: unknown) {
          if (error instanceof CliConfigError) {
            console.error(`Error: ${error.message}`);
            process.exit(error.exitCode);
          }
          throw error;
        }
      }),
  );
