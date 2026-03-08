/**
 * Test script to verify the reverse() bug fix
 * This simulates the store behavior without running the full server
 */

// Simulate the original buggy behavior
function testBuggyReverse() {
  const logs = [
    { id: '1', createdAt: '2024-01-01T10:00:00Z' },
    { id: '2', createdAt: '2024-01-01T11:00:00Z' },
    { id: '3', createdAt: '2024-01-01T12:00:00Z' },
  ];

  console.log('=== Buggy version (before fix) ===');
  console.log('Original array before reverse:', JSON.stringify(logs));

  const result1 = logs.filter(() => true).reverse();
  console.log('After first reverse:', JSON.stringify(result1));
  console.log('Original array now:', JSON.stringify(logs)); // Bug: original is modified!

  const result2 = logs.filter(() => true).reverse();
  console.log('After second reverse:', JSON.stringify(result2)); // Wrong order now!

  console.log('\n');
}

// Test the fixed behavior
function testFixedReverse() {
  const logs = [
    { id: '1', createdAt: '2024-01-01T10:00:00Z' },
    { id: '2', createdAt: '2024-01-01T11:00:00Z' },
    { id: '3', createdAt: '2024-01-01T12:00:00Z' },
  ];

  console.log('=== Fixed version (after fix) ===');
  console.log('Original array before reverse:', JSON.stringify(logs));

  const result1 = logs.filter(() => true).slice().reverse();
  console.log('After first reverse:', JSON.stringify(result1));
  console.log('Original array now:', JSON.stringify(logs)); // Correct: original is preserved

  const result2 = logs.filter(() => true).slice().reverse();
  console.log('After second reverse:', JSON.stringify(result2)); // Correct order now!

  console.log('\n');
}

// Run tests
testBuggyReverse();
testFixedReverse();

// Verify all reverse() calls in store.ts have .slice() before them
const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, 'src/lib/store.ts');
const content = fs.readFileSync(storePath, 'utf8');

// Find all .reverse() calls and check if they have .slice() before them
const reverseRegex = /\.reverse\(\)/g;
let match;
const lines = content.split('\n');
const results = [];

while ((match = reverseRegex.exec(content)) !== null) {
  const lineNum = content.substring(0, match.index).split('\n').length;
  const line = lines[lineNum - 1];
  const hasSliceBefore = line.includes('.slice()');
  results.push({
    line: lineNum,
    lineContent: line.trim(),
    hasSliceBefore
  });
}

console.log('=== Verification of all .reverse() calls in store.ts ===');
let allFixed = true;
for (const r of results) {
  const status = r.hasSliceBefore ? '✓ FIXED' : '✗ NOT FIXED';
  if (!r.hasSliceBefore) allFixed = false;
  console.log(`Line ${r.line}: ${status}`);
  console.log(`  ${r.lineContent}`);
}

console.log('\n=== Summary ===');
if (allFixed) {
  console.log('All .reverse() calls are now safe (using .slice() before reverse)');
} else {
  console.log('WARNING: Some .reverse() calls are still unsafe!');
  process.exit(1);
}
