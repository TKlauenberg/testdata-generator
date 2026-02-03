#!/usr/bin/env bun
/**
 * Verify example schema files validate successfully
 */

import { validateSchema } from '../packages/core/src/validate';
import * as fs from 'fs';
import * as path from 'path';

const examplesDir = path.join(import.meta.dir, 'examples');
const examples = [
  'basic-schema.td',
  'user-profile.td',
  'complex-schema.td',
];

let allPassed = true;

for (const filename of examples) {
  const filepath = path.join(examplesDir, filename);
  const source = fs.readFileSync(filepath, 'utf-8');
  
  console.log(`\nValidating ${filename}...`);
  const result = validateSchema(source, filename);
  
  if (result.ok) {
    console.log(`✅ ${filename}: Valid`);
    console.log(`   Schemas: ${result.value.schemas.size}`);
    console.log(`   Fields: ${result.value.metadata.totalFields}`);
  } else {
    console.log(`❌ ${filename}: Failed`);
    result.errors.forEach(err => {
      console.log(`   ${err.location?.line}:${err.location?.column} - ${err.message}`);
    });
    allPassed = false;
  }
}

console.log(`\n${allPassed ? '✅ All examples validated successfully!' : '❌ Some examples failed validation'}`);
process.exit(allPassed ? 0 : 1);
