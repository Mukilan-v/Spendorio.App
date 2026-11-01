const assert = require('assert');

// Mock browser globals
global.document = {
  addEventListener: () => {},
  getElementById: () => null,
  hidden: false
};
const localStorageStore = {};
global.localStorage = {
  getItem: (key) => localStorageStore[key] !== undefined ? localStorageStore[key] : null,
  setItem: (key, val) => { localStorageStore[key] = String(val); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }
};
global.window = {
  location: { protocol: 'https:' },
  addEventListener: () => {},
  markLocalUpdated: () => {},
  firebaseSync: null
};

// Load storage.js & expenses.js
require('../public/js/storage.js');
require('../public/js/expenses.js');

const expenseMgr = window.expenses;
const storage = window.storage;

console.log('--- Test 1: Extraction & mapping in getKnownPersonConfig() ---');
const testCases = [
  { text: 'Mom recharge 299', expected: 'Mom' },
  { text: 'Mother lunch', expected: 'Mom' },
  { text: 'Dad medicine 150', expected: 'Dad' },
  { text: 'Father petrol', expected: 'Dad' },
  { text: 'Brother college fee', expected: 'Brother' },
  { text: 'Bro purchase', expected: 'Brother' },
  { text: 'Sister exam fees', expected: 'Sister' },
  { text: 'Sis birthday gift', expected: 'Sister' }
];

testCases.forEach(({ text, expected }) => {
  const extracted = expenseMgr.extractPersons(text);
  assert(extracted.length > 0, `Should extract person from "${text}"`);
  assert.strictEqual(extracted[0].name, expected, `"${text}" should map to "${expected}", got "${extracted[0].name}"`);
  console.log(`✓ "${text}" -> [${extracted[0].name}]`);
});

console.log('\n--- Test 2: Pocket money giver normalization in buildPocketGiverMap() ---');
storage.saveIncomes([
  { id: '1', title: 'Appa gave cash', amount: 1000, date: '2026-11-01', giver: 'Appa', isPocketMoney: true },
  { id: '2', title: 'Amma support', amount: 500, date: '2026-11-01', giver: 'Amma', isPocketMoney: true },
  { id: '3', title: 'Anna allowance', amount: 2000, date: '2026-11-01', giver: 'Anna', isPocketMoney: true },
  { id: '4', title: 'Akka gift', amount: 1500, date: '2026-11-01', giver: 'Akka', isPocketMoney: true }
]);

const giverMap = expenseMgr.buildPocketGiverMap('all');
console.log('Givers mapped:', Object.keys(giverMap));
assert(giverMap['Dad'], 'Giver Appa must normalize to Dad');
assert.strictEqual(giverMap['Dad'].total, 1000);
assert(giverMap['Mom'], 'Giver Amma must normalize to Mom');
assert.strictEqual(giverMap['Mom'].total, 500);
assert(giverMap['Brother'], 'Giver Anna must normalize to Brother');
assert.strictEqual(giverMap['Brother'].total, 2000);
assert(giverMap['Sister'], 'Giver Akka must normalize to Sister');
assert.strictEqual(giverMap['Sister'].total, 1500);
console.log('✓ All legacy giver entries properly normalized to English relations in giverMap');

console.log('\n--- Test 3: migrateAnonymizedNames() sanitization ---');
storage.migrateAnonymizedNames();
const sanitizedIncomes = storage.getIncomes();
sanitizedIncomes.forEach(i => {
  assert(!/\b(appa|amma|anna|akka|thangachi)\b/i.test(i.title), `Title should be sanitized: ${i.title}`);
  assert(!/\b(appa|amma|anna|akka|thangachi)\b/i.test(i.giver), `Giver should be sanitized: ${i.giver}`);
  console.log(`✓ Sanitized Income: ${i.giver} | ${i.title}`);
});

console.log('\n=============================================');
console.log('ALL RELATION RENAMING TESTS PASSED (100%)');
console.log('=============================================');
