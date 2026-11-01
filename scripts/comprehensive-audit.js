const fs = require('fs');

console.log('=== 1. AUDITING GITHUB PRIVACY & COMMITS ===');
const html = fs.readFileSync('public/index.html', 'utf8');
const cdnRegex = /(https?:\/\/[^\s"'<>]+)/g;
let m;
const matches = new Set();
while ((m = cdnRegex.exec(html)) !== null) {
  matches.add(m[1]);
}
console.log('External URLs in index.html:');
matches.forEach(u => console.log(' -', u));

// 2. Check seed data
const storage = fs.readFileSync('public/js/storage.js', 'utf8');
const hasDummySeed = storage.includes('const expenses = [];') && storage.includes('const incomes = [];');
console.log('Zero personal expenses in seedData:', hasDummySeed);

// 3. Check for any legacy Tamil family names in public/ and docs/
const files = [
  'public/index.html', 'docs/index.html',
  'public/js/app.js', 'docs/js/app.js',
  'public/js/expenses.js', 'docs/js/expenses.js',
  'public/js/storage.js', 'docs/js/storage.js',
  'public/js/auth.js', 'docs/js/auth.js',
  'public/js/tasks.js', 'docs/js/tasks.js',
  'public/js/reports.js', 'docs/js/reports.js'
];

const bannedRegex = /\b(amma|appa|anna|akka|thangachi|thambi)\b/i;
let bannedFound = 0;
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    // Exclude mapping keys array like keys: ['mom', 'mother', 'amma']
    if (l.includes("keys:") || l.includes("legacyMap") || l.includes("sanitize")) return;
    if (bannedRegex.test(l)) {
      console.warn(`[WARN] Legacy keyword found in ${f}:${idx+1} -> ${l.trim()}`);
      bannedFound++;
    }
  });
});
if (bannedFound === 0) {
  console.log('✓ Zero unmapped legacy keywords in UI, templates, or logic!');
}

console.log('=== 2. AUDITING APP PERFORMANCE & SIZES ===');
files.forEach(f => {
  const stat = fs.statSync(f);
  console.log(` - ${f}: ${(stat.size / 1024).toFixed(1)} KB`);
});
