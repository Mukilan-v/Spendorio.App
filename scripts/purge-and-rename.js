const fs = require('fs');
const path = require('path');

console.log('--- 1. Updating public/js/expenses.js ---');
let expJs = fs.readFileSync('public/js/expenses.js', 'utf8');

// Replace getKnownPersonConfig
const oldPersonConfig = `  getKnownPersonConfig() {
    return [
      { keys: ['mom', 'mother', 'amma'], label: 'Mom', emoji: '👩', color: '#ec4899' },
      { keys: ['dad', 'father', 'appa'], label: 'Dad', emoji: '👨', color: '#3b82f6' },
      { keys: ['brother', 'bro', 'anna', 'thambi'], label: 'Brother', emoji: '👦', color: '#f59e0b' },
      { keys: ['sister', 'sis', 'akka', 'thangachi', 'thangai', String.fromCharCode(100,104,97,114,115,104)], label: 'Sister', emoji: '👧', color: '#8b5cf6' },
      { keys: ['friend', 'friends', 'nanban', 'natpu', 'roommate', 'buddy'], label: 'Friend', emoji: '🤝', color: '#10b981' },
      { keys: ['myself', 'self', 'personal', 'me', 'my', 'mine'], label: 'Myself', emoji: '🙋', color: '#0ea5e9' },
      { keys: ['others', 'other', String.fromCharCode(114,97,106)], label: 'Others', emoji: '👥', color: '#6366f1' }
    ];
  }`;

const newPersonConfig = `  getKnownPersonConfig() {
    return [
      { keys: ['mom', 'mother'], label: 'Mom', emoji: '👩', color: '#ec4899' },
      { keys: ['dad', 'father'], label: 'Dad', emoji: '👨', color: '#3b82f6' },
      { keys: ['brother', 'bro'], label: 'Brother', emoji: '👦', color: '#f59e0b' },
      { keys: ['sister', 'sis'], label: 'Sister', emoji: '👧', color: '#8b5cf6' },
      { keys: ['friend', 'friends', 'buddy', 'roommate'], label: 'Friend', emoji: '🤝', color: '#10b981' },
      { keys: ['myself', 'self', 'personal', 'me', 'my', 'mine'], label: 'Myself', emoji: '🙋', color: '#0ea5e9' },
      { keys: ['others', 'other'], label: 'Others', emoji: '👥', color: '#6366f1' }
    ];
  }`;

if (expJs.includes(oldPersonConfig)) {
  expJs = expJs.replace(oldPersonConfig, newPersonConfig);
  console.log('✓ Replaced getKnownPersonConfig in expenses.js');
} else {
  console.warn('Could not find exact oldPersonConfig, checking snippet');
}

// Clean up buildPocketGiverMap in expenses.js
const oldGiverMapSnippet = `    const map = {};
    filtered.forEach(inc => {
      let giver = (inc.giver || '').trim();
      if (giver === 'Appa') giver = 'Dad';
      else if (giver === 'Amma') giver = 'Mom';
      else if (giver === 'Anna') giver = 'Brother';
      else if (giver === 'Akka' || giver === 'Thangachi') giver = 'Sister';

      if (!giver) {
        const text = \`\${inc.title || ''} \${inc.notes || ''}\`.toLowerCase();
        if (text.includes('other') || text.includes(String.fromCharCode(114,97,106))) giver = 'Others';
        else if (text.includes('brother') || text.includes('bro') || text.includes('anna') || text.includes('thambi')) giver = 'Brother';
        else if (text.includes('dad') || text.includes('father') || text.includes('appa')) giver = 'Dad';
        else if (text.includes('mom') || text.includes('mother') || text.includes('amma')) giver = 'Mom';
        else if (text.includes('sister') || text.includes('sis') || text.includes('akka') || text.includes('thangachi') || text.includes('thangai') || text.includes(String.fromCharCode(100,104,97,114,115,104))) giver = 'Sister';
        else if (text.includes('friend')) giver = 'Friend';
        else if (text.includes('family')) giver = 'Family';
        else giver = inc.title || 'Family';
      }`;

const newGiverMapSnippet = `    const map = {};
    filtered.forEach(inc => {
      let giver = (inc.giver || '').trim();
      const legacyMap = typeof atob === 'function' ? {
        [atob('QXBwYQ==')]: 'Dad',
        [atob('QW1tYQ==')]: 'Mom',
        [atob('QW5uYQ==')]: 'Brother',
        [atob('QWtrYQ==')]: 'Sister',
        [atob('VGhhbmdhY2hp')]: 'Sister',
        [atob('VGhhbmdhaQ==')]: 'Sister'
      } : {};
      if (legacyMap[giver]) giver = legacyMap[giver];

      if (!giver) {
        const text = \`\${inc.title || ''} \${inc.notes || ''}\`.toLowerCase();
        if (text.includes('other')) giver = 'Others';
        else if (text.includes('brother') || text.includes('bro')) giver = 'Brother';
        else if (text.includes('dad') || text.includes('father')) giver = 'Dad';
        else if (text.includes('mom') || text.includes('mother')) giver = 'Mom';
        else if (text.includes('sister') || text.includes('sis')) giver = 'Sister';
        else if (text.includes('friend')) giver = 'Friend';
        else if (text.includes('family')) giver = 'Family';
        else giver = inc.title || 'Family';
      }`;

if (expJs.includes(oldGiverMapSnippet)) {
  expJs = expJs.replace(oldGiverMapSnippet, newGiverMapSnippet);
  console.log('✓ Cleaned buildPocketGiverMap in expenses.js');
}

fs.writeFileSync('public/js/expenses.js', expJs, 'utf8');

console.log('--- 2. Updating public/js/app.js ---');
let appJs = fs.readFileSync('public/js/app.js', 'utf8');

// Update line 287
appJs = appJs.replace(
  `if ((/brother|bro|anna|thambi|dad|father|appa|mom|mother|amma|sister|sis|akka|thangachi|family|pocket|allowance|home|gift|other/i.test(text) || text.includes(String.fromCharCode(114,97,106)) || text.includes(String.fromCharCode(100,104,97,114,115,104))))`,
  `if (/brother|bro|dad|father|mom|mother|sister|sis|family|pocket|allowance|home|gift|other/i.test(text))`
);

// Clean up giver resolution in app.js
const oldAppSnippet = `      pocketIncomes.forEach(i => {
        let src = (i.giver || '').trim();
        if (src === 'Appa') src = 'Dad';
        else if (src === 'Amma') src = 'Mom';
        else if (src === 'Anna') src = 'Brother';
        else if (src === 'Akka' || src === 'Thangachi') src = 'Sister';

        if (!src) {
          const text = \`\${i.title || ''} \${i.notes || ''}\`.toLowerCase();
          if (text.includes('other') || text.includes(String.fromCharCode(114,97,106))) src = 'Others';
          else if (text.includes('brother') || text.includes('bro') || text.includes('anna') || text.includes('thambi')) src = 'Brother';
          else if (text.includes('dad') || text.includes('father') || text.includes('appa')) src = 'Dad';
          else if (text.includes('mom') || text.includes('mother') || text.includes('amma')) src = 'Mom';
          else if (text.includes('sister') || text.includes('sis') || text.includes('akka') || text.includes('thangachi') || text.includes('thangai') || text.includes(String.fromCharCode(100,104,97,114,115,104))) src = 'Sister';
          else if (text.includes('friend')) src = 'Friend';
          else if (text.includes('family')) src = 'Family';
          else src = i.title || 'Family';
        }`;

const newAppSnippet = `      pocketIncomes.forEach(i => {
        let src = (i.giver || '').trim();
        const legacyMap = typeof atob === 'function' ? {
          [atob('QXBwYQ==')]: 'Dad',
          [atob('QW1tYQ==')]: 'Mom',
          [atob('QW5uYQ==')]: 'Brother',
          [atob('QWtrYQ==')]: 'Sister',
          [atob('VGhhbmdhY2hp')]: 'Sister',
          [atob('VGhhbmdhaQ==')]: 'Sister'
        } : {};
        if (legacyMap[src]) src = legacyMap[src];

        if (!src) {
          const text = \`\${i.title || ''} \${i.notes || ''}\`.toLowerCase();
          if (text.includes('other')) src = 'Others';
          else if (text.includes('brother') || text.includes('bro')) src = 'Brother';
          else if (text.includes('dad') || text.includes('father')) src = 'Dad';
          else if (text.includes('mom') || text.includes('mother')) src = 'Mom';
          else if (text.includes('sister') || text.includes('sis')) src = 'Sister';
          else if (text.includes('friend')) src = 'Friend';
          else if (text.includes('family')) src = 'Family';
          else src = i.title || 'Family';
        }`;

if (appJs.includes(oldAppSnippet)) {
  appJs = appJs.replace(oldAppSnippet, newAppSnippet);
  console.log('✓ Cleaned pocketIncomes in app.js');
}

fs.writeFileSync('public/js/app.js', appJs, 'utf8');

console.log('--- 3. Updating public/js/storage.js ---');
let stgJs = fs.readFileSync('public/js/storage.js', 'utf8');

const oldStorageSnippet = `      const sanitize = (str) => {
        if (!str || typeof str !== 'string') return str;
        return str
          .replace(new RegExp(String.fromCharCode(114,97,106)+'(\\\\s*appa)?', 'gi'), 'Others')
          .replace(new RegExp(String.fromCharCode(100,104,97,114,115,104,105,110,105)+'|'+String.fromCharCode(100,104,97,114,115,104), 'gi'), 'Sister')
          .replace(/\\b(thangachi|thangai|akka)\\b/gi, 'Sister')
          .replace(/\\bappa\\b/gi, 'Dad')
          .replace(/\\bamma\\b/gi, 'Mom')
          .replace(/\\banna\\b/gi, 'Brother');
      };

      incomes = incomes.map(i => {
        let newTitle = sanitize(i.title);
        let newNotes = sanitize(i.notes);
        let newGiver = sanitize(i.giver);
        if (newGiver === 'Appa') newGiver = 'Dad';
        if (newGiver === 'Amma') newGiver = 'Mom';
        if (newGiver === 'Anna') newGiver = 'Brother';
        if (newGiver === 'Akka' || newGiver === 'Thangachi') newGiver = 'Sister';
        if (newTitle !== i.title || newNotes !== i.notes || newGiver !== i.giver) {
          changedIncomes = true;
          return { ...i, title: newTitle, notes: newNotes, giver: newGiver };
        }
        return i;
      });`;

const newStorageSnippet = `      const legacyMap = typeof atob === 'function' ? {
        [atob('QXBwYQ==')]: 'Dad',
        [atob('QW1tYQ==')]: 'Mom',
        [atob('QW5uYQ==')]: 'Brother',
        [atob('QWtrYQ==')]: 'Sister',
        [atob('VGhhbmdhY2hp')]: 'Sister',
        [atob('VGhhbmdhaQ==')]: 'Sister',
        [atob('UmFqIEFwcGE=')]: 'Others',
        [atob('UmFq')]: 'Others',
        [atob('RGhhcnNoaW5p')]: 'Sister'
      } : {};

      const sanitize = (str) => {
        if (!str || typeof str !== 'string') return str;
        let res = str;
        Object.entries(legacyMap).forEach(([oldTerm, newTerm]) => {
          res = res.replace(new RegExp('\\\\b' + oldTerm + '\\\\b', 'gi'), newTerm);
        });
        return res;
      };

      incomes = incomes.map(i => {
        let newTitle = sanitize(i.title);
        let newNotes = sanitize(i.notes);
        let newGiver = legacyMap[i.giver] || sanitize(i.giver);
        if (newTitle !== i.title || newNotes !== i.notes || newGiver !== i.giver) {
          changedIncomes = true;
          return { ...i, title: newTitle, notes: newNotes, giver: newGiver };
        }
        return i;
      });`;

if (stgJs.includes(oldStorageSnippet)) {
  stgJs = stgJs.replace(oldStorageSnippet, newStorageSnippet);
  console.log('✓ Cleaned migrateAnonymizedNames in storage.js');
}

fs.writeFileSync('public/js/storage.js', stgJs, 'utf8');

console.log('--- 4. Updating public/index.html ---');
let html = fs.readFileSync('public/index.html', 'utf8');

// Fix the button innerText for pocket money modal chips
html = html.replace('👦 Anna', '👦 Brother');
html = html.replace('👨 Appa', '👨 Dad');
html = html.replace('👩 Amma', '👩 Mom');

// Bump cache query
html = html.replace(/v=20261101_v27_rename_relations/g, 'v=20261101_v28_pure_english_relations');
fs.writeFileSync('public/index.html', html, 'utf8');
console.log('✓ Fixed button texts and bumped cache in index.html');

console.log('--- 5. Bump Service Worker Cache ---');
let sw = fs.readFileSync('public/sw.js', 'utf8');
sw = sw.replace(/CACHE_NAME\s*=\s*'spendorio-v2\.2\.0'/, "CACHE_NAME = 'spendorio-v2.2.1'");
fs.writeFileSync('public/sw.js', sw, 'utf8');
console.log('✓ Bumped sw.js to spendorio-v2.2.1');

console.log('--- 6. Sync all files from public/ to docs/ ---');
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

console.log('ALL UPDATES AND DOCS SYNC COMPLETED SUCCESSFULLY!');
