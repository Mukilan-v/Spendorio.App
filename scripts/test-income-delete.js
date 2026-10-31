const assert = require('assert');

// Mock localStorage
const localStorageStore = {};
global.localStorage = {
  getItem: (key) => localStorageStore[key] !== undefined ? localStorageStore[key] : null,
  setItem: (key, val) => { localStorageStore[key] = String(val); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }
};

global.document = {
  addEventListener: () => {},
  getElementById: () => null,
  hidden: false
};

global.window = {
  location: { protocol: 'https:' },
  addEventListener: () => {},
  markLocalUpdated: () => {},
  firebaseSync: null
};

// Load storage.js
require('../public/js/storage.js');
const storage = window.storage;

console.log('--- Test 1: Add Income and verify ID generation ---');
const income1 = storage.addIncome({
  title: 'Appa',
  amount: 1000,
  category: 'Family Support',
  date: '2026-07-25',
  giver: 'Appa',
  isPocketMoney: true
});

assert(income1.id, 'Income must have a generated ID');
assert.strictEqual(typeof income1.id, 'string');
console.log('✓ Income created with ID:', income1.id);

let incomes = storage.getIncomes();
assert.strictEqual(incomes.length, 1);
assert.strictEqual(incomes[0].id, income1.id);
console.log('✓ Income retrieved correctly from storage');

console.log('--- Test 2: Delete Income and verify tombstone tracking ---');
const deleted = storage.deleteIncome(income1.id);
assert.strictEqual(deleted, true);

incomes = storage.getIncomes();
assert.strictEqual(incomes.length, 0, 'Incomes must be empty after deletion');
console.log('✓ Income removed from local incomes list');

const deletedIds = storage.getDeletedIds();
assert(deletedIds.has(income1.id), 'Deleted ID must be recorded in tombstone set');
console.log('✓ Tombstone recorded in deletedIds set:', Array.from(deletedIds));

console.log('--- Test 3: Firebase mergeEntitiesById must NOT resurrect deleted item ---');
// Mock FirebaseSync
require('../public/js/firebase-sync.js');
const firebaseSync = window.firebaseSync;

const localList = storage.getIncomes(); // Empty []
const simulatedCloudList = [
  {
    id: income1.id,
    title: 'Appa',
    amount: 1000,
    category: 'Family Support',
    date: '2026-07-25'
  },
  {
    id: 'inc-other-valid-999',
    title: 'Freelance Project',
    amount: 5000,
    category: 'Salary',
    date: '2026-07-26'
  }
];

const merged = firebaseSync.mergeEntitiesById(localList, simulatedCloudList, deletedIds);
console.log('Merged results count:', merged.length);
assert.strictEqual(merged.length, 1, 'Only non-deleted cloud items should survive merge');
assert.strictEqual(merged[0].id, 'inc-other-valid-999', 'Only the un-deleted record should survive');
assert(!merged.find(i => i.id === income1.id), 'Deleted income MUST NOT be resurrected from cloud');
console.log('✓ Resurrection successfully prevented by tombstone check!');

console.log('--- Test 4: Legacy income without ID gets assigned an ID on read ---');
localStorage.setItem('taskcost_incomes', JSON.stringify([
  { title: 'Legacy Cash', amount: 500, date: '2026-07-20' }
]));

const refreshedIncomes = storage.getIncomes();
assert.strictEqual(refreshedIncomes.length, 1);
assert(refreshedIncomes[0].id, 'Legacy income must be assigned a unique ID');
assert(refreshedIncomes[0].id.startsWith('inc-'), 'ID should follow inc- prefix');
console.log('✓ Legacy income auto-assigned ID:', refreshedIncomes[0].id);

// Deleting legacy income works too
storage.deleteIncome(refreshedIncomes[0].id);
assert.strictEqual(storage.getIncomes().length, 0);
assert(storage.getDeletedIds().has(refreshedIncomes[0].id));
console.log('✓ Legacy income successfully deleted and marked in tombstones!');

console.log('\n====================================');
console.log('ALL TESTS PASSED SUCCESSFULLY! (100%)');
console.log('====================================');
