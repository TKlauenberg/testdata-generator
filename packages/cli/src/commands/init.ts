/**
 * Init Command Implementation
 *
 * Implements the `td init` command for initializing new schemas from templates.
 *
 * @module commands/init
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

/**
 * Get the directory name for ESM modules.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Available template names.
 */
const AVAILABLE_TEMPLATES = ['basic'];

/**
 * Default template name.
 */
const DEFAULT_TEMPLATE = 'basic';

/**
 * Init command for creating new schemas from templates.
 *
 * Usage:
 *   td init
 *   td init basic
 */
export const initCommand = new Command('init')
  .description('Initialize a new schema from template')
  .argument(
    '[template]',
    `Template name (default: ${DEFAULT_TEMPLATE})`,
    DEFAULT_TEMPLATE
  )
  .action(async (template: string) => {
    try {
      // 1. Validate template name
      if (!AVAILABLE_TEMPLATES.includes(template)) {
        console.error(`Error: Template '${template}' not found`);
        console.error(`Available templates: ${AVAILABLE_TEMPLATES.join(', ')}`);
        process.exit(3);
      }

      // 2. Resolve template path
      const templatePath = path.join(
        __dirname,
        '../../templates',
        `${template}.td`
      );

      // Verify template file exists
      try {
        await fs.access(templatePath);
      } catch {
        console.error(`Error: Template file not found at ${templatePath}`);
        process.exit(3);
      }

      // 3. Determine output path
      const outputFilename = `${template}.td`;
      const outputPath = path.join(process.cwd(), outputFilename);

      // 4. Check if output file already exists
      const fileExists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);

      if (fileExists) {
        const confirmed = await promptConfirmation(
          `File '${outputFilename}' already exists. Overwrite? (y/n): `
        );

        if (!confirmed) {
          // eslint-disable-next-line no-console -- User feedback message
          console.log('Operation cancelled');
          process.exit(3);
        }
      }

      // 5. Read template content
      const templateContent = await fs.readFile(templatePath, 'utf-8');

      // 6. Write to output file
      await fs.writeFile(outputPath, templateContent, 'utf-8');

      // 7. Display success message and next steps
      // eslint-disable-next-line no-console -- Success message goes to stdout
      console.log(`✓ Created ${outputFilename}`);
      // eslint-disable-next-line no-console -- Next steps guidance
      console.log('\nNext steps:');
      // eslint-disable-next-line no-console -- Next steps guidance
      console.log(`  1. Edit ${outputFilename} to customize your schema`);
      // eslint-disable-next-line no-console -- Next steps guidance
      console.log(`  2. Validate: td validate ${outputFilename}`);
      // eslint-disable-next-line no-console -- Next steps guidance
      console.log(`  3. Generate data: td generate ${outputFilename} --count 10`);
      // eslint-disable-next-line no-console -- Next steps guidance
      console.log('\nLearn more: docs/dsl-reference.md\n');

      process.exit(0);
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Error: ${error.message}`);
      process.exit(3);
    }
  });

/**
 * Prompt user for yes/no confirmation.
 *
 * @param prompt - The prompt message to display
 * @returns Promise that resolves to true if user confirms, false otherwise
 */
async function promptConfirmation(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}
