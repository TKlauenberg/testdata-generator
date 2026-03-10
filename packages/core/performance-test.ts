/**
 * Performance Validation Script
 *
 * Validates NFR1: Generate 1000 records in under 60 seconds
 * Validates that 100k records work without memory issues
 */

import { generateData } from './src/generateData';

const schema = `
  schema User {
    id: number
    name: string
    active: boolean
  }
`;

// Test 1: 1000 records < 60 seconds
console.log('📊 Performance Test 1: 1000 records in < 60s');
console.log('================================================\n');

const start1 = Date.now();
let count1 = 0;

for await (const _record of generateData(schema, { count: 1000, seed: 42 })) {
  count1++;
}

const duration1 = (Date.now() - start1) / 1000;
console.log(`✓ Generated ${count1} records in ${duration1.toFixed(2)}s`);
console.log(`  Rate: ${(count1 / duration1).toFixed(0)} records/sec`);

if (duration1 < 60) {
  console.log(`✅ PASS: Under 60 seconds (NFR1 requirement met)\n`);
} else {
  console.log(`❌ FAIL: Exceeded 60 seconds (NFR1 requirement not met)\n`);
  process.exit(1);
}

// Test 2: 100k records without memory explosion
console.log('📊 Performance Test 2: 100k records memory test');
console.log('================================================\n');

const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
const start2 = Date.now();
let count2 = 0;

for await (const _record of generateData(schema, { count: 100000, seed: 99 })) {
  count2++;

  // Log progress
  if (count2 % 10000 === 0) {
    const memCurrent = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`  ${count2.toLocaleString()} records... (${memCurrent.toFixed(2)} MB)`);
  }
}

const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
const memGrowth = memAfter - memBefore;
const duration2 = (Date.now() - start2) / 1000;

console.log(`\n✓ Generated ${count2.toLocaleString()} records in ${duration2.toFixed(2)}s`);
console.log(`  Rate: ${(count2 / duration2).toFixed(0)} records/sec`);
console.log(`  Memory before: ${memBefore.toFixed(2)} MB`);
console.log(`  Memory after: ${memAfter.toFixed(2)} MB`);
console.log(`  Memory growth: ${memGrowth.toFixed(2)} MB`);
console.log(`  Per-record: ${(memGrowth / count2 * 1000).toFixed(3)} KB`);

if (memGrowth < 100) {
  console.log(`✅ PASS: Memory growth < 100 MB (streaming works correctly)\n`);
} else {
  console.log(`❌ FAIL: Memory growth > 100 MB (potential memory leak)\n`);
  process.exit(1);
}

console.log('✅ All performance tests passed!');
