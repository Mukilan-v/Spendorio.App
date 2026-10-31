const fs = require('fs');
const path = require('path');

// 1. Update index.html in public
let pubHtml = fs.readFileSync('public/index.html', 'utf8');
pubHtml = pubHtml.replace(/v=20261031_v22_pocket_givers_list/g, 'v=20261101_v26_income_delete_fix');
fs.writeFileSync('public/index.html', pubHtml, 'utf8');
console.log('Updated public/index.html cache version');

// 2. Synchronize all modified files from public/ to docs/
const filesToSync = [
  'index.html',
  'sw.js',
  'js/storage.js',
  'js/firebase-sync.js',
  'js/expenses.js',
  'js/app.js'
];

filesToSync.forEach(relPath => {
  const src = path.join('public', relPath);
  const dst = path.join('docs', relPath);
  const content = fs.readFileSync(src, 'utf8');
  fs.writeFileSync(dst, content, 'utf8');
  console.log(`Synced ${src} -> ${dst}`);
});

console.log('All files synced to docs/ successfully.');
