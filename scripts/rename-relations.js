const fs = require('fs');
const path = require('path');

// 1. Process public/index.html
let html = fs.readFileSync('public/index.html', 'utf8');

// Quick select person tags
html = html.replace("insertPersonTag('Amma')", "insertPersonTag('Mom')");
html = html.replace('>👩 Amma</button>', '>👩 Mom</button>');
html = html.replace("insertPersonTag('Appa')", "insertPersonTag('Dad')");
html = html.replace('>👨 Appa</button>', '>👨 Dad</button>');
html = html.replace("insertPersonTag('Anna')", "insertPersonTag('Brother')");
html = html.replace('>🧑 Anna</button>', '>👦 Brother</button>');

// Notes placeholder
html = html.replace(
  'placeholder="e.g. Amma recharge 299, Appa medicine, Dinner with friend, Sister college..."',
  'placeholder="e.g. Mom recharge 299, Dad medicine, Dinner with friend, Sister college..."'
);

// Income title placeholder
html = html.replace(
  'placeholder="e.g., Anna gave money, Support from Others"',
  'placeholder="e.g., Brother gave money, Support from Dad"'
);

// Pocket money giver chips
html = html.replace("selectPocketMoneyGiver('Anna', '👦', '#f59e0b')", "selectPocketMoneyGiver('Brother', '👦', '#f59e0b')");
html = html.replace(/\b👦\s*Anna\b/g, '👦 Brother');

html = html.replace("selectPocketMoneyGiver('Appa', '👨', '#3b82f6')", "selectPocketMoneyGiver('Dad', '👨', '#3b82f6')");
html = html.replace(/\b👨\s*Appa\b/g, '👨 Dad');

html = html.replace("selectPocketMoneyGiver('Amma', '👩', '#ec4899')", "selectPocketMoneyGiver('Mom', '👩', '#ec4899')");
html = html.replace(/\b👩\s*Amma\b/g, '👩 Mom');

// Bump cache version in public/index.html
html = html.replace(/v=20261101_v26_income_delete_fix/g, 'v=20261101_v27_rename_relations');
fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Updated public/index.html');

// 2. Bump sw.js cache name
let sw = fs.readFileSync('public/sw.js', 'utf8');
sw = sw.replace(/CACHE_NAME\s*=\s*'spendorio-v2\.1\.9'/, "CACHE_NAME = 'spendorio-v2.2.0'");
fs.writeFileSync('public/sw.js', sw, 'utf8');
console.log('Updated public/sw.js cache to spendorio-v2.2.0');

// 3. Sync all modified files to docs/
const filesToSync = [
  'index.html',
  'sw.js',
  'js/storage.js',
  'js/expenses.js',
  'js/app.js',
  'js/reports.js'
];

filesToSync.forEach(relPath => {
  const src = path.join('public', relPath);
  const dst = path.join('docs', relPath);
  const content = fs.readFileSync(src, 'utf8');
  fs.writeFileSync(dst, content, 'utf8');
  console.log(`Synced ${src} -> ${dst}`);
});

console.log('All updates and docs sync completed successfully.');
