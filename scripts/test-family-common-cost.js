const assert = require('assert');
const fs = require('fs');

console.log('--- RUNNING FAMILY & COMMON COST VERIFICATION SUITE ---');

// Mock browser globals
class ElementMock {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.style = {};
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
    this.placeholder = '';
    this.options = [];
    this.classList = {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    };
  }
  appendChild(child) {
    this.options.push(child);
  }
}

const elements = {};
function getOrCreate(id, tagName = 'div') {
  if (!elements[id]) {
    elements[id] = new ElementMock(id, tagName);
  }
  return elements[id];
}

global.document = {
  addEventListener() {},
  getElementById(id) {
    return elements[id] || getOrCreate(id);
  },
  createElement(tag) {
    return new ElementMock('', tag);
  }
};

const store = {};
global.localStorage = {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

global.window = {
  addEventListener() {},
  location: { protocol: 'https:' },
  app: {
    showToast: () => {},
    updateSummaryMetrics: () => {},
    isPocketMoney: (inc) => Boolean(inc.isPocketMoney === true || inc.giver || inc.category === 'Family Support' || inc.category === 'Pocket Money')
  },
  charts: {
    renderAll: () => {}
  }
};

// Load storage.js
const storageCode = fs.readFileSync('public/js/storage.js', 'utf8');
eval(storageCode);

// Verify getInitialSeedData has zero personal names
const seed = getInitialSeedData();
assert.strictEqual(Array.isArray(seed.expenses), true);
assert.strictEqual(seed.expenses.length, 0, 'Seed expenses must be empty');
assert.strictEqual(seed.incomes.length, 0, 'Seed incomes must be empty');
console.log('✓ Initial seed data is clean with zero personal data');

// Load expenses.js
const expensesCode = fs.readFileSync('public/js/expenses.js', 'utf8');
eval(expensesCode);

const manager = window.expenses || new ExpenseManager();

// Test 1: getKnownPersonConfig includes Family
const config = manager.getKnownPersonConfig();
const familyEntry = config.find(c => c.label === 'Family');
assert.ok(familyEntry, 'Family must be in getKnownPersonConfig');
assert.strictEqual(familyEntry.emoji, '👨‍👩‍👧‍👦');
assert.strictEqual(familyEntry.color, '#10b981');
assert.ok(familyEntry.keys.includes('family'));
assert.ok(familyEntry.keys.includes('household'));
assert.ok(familyEntry.keys.includes('common'));
console.log('✓ getKnownPersonConfig correctly configured for Family [Common Cost]');

// Test 2: Extraction tests
const testCases = [
  { notes: 'Family groceries 1200', title: '', expected: ['Family'] },
  { notes: 'household items purchase', title: '', expected: ['Family'] },
  { notes: 'common electricity bill', title: '', expected: ['Family'] },
  { notes: 'Mom recharge 299', title: '', expected: ['Mom'] },
  { notes: 'Dad medicine', title: 'Hospital', expected: ['Dad'] },
  { notes: 'Sister fees', title: 'College', expected: ['Sister'] },
  { notes: 'Dinner with friend', title: 'Restaurant', expected: ['Friend'] },
  { notes: 'Family shopping with Mom and Sister', title: 'Supermarket', expected: ['Family', 'Mom', 'Sister'] }
];

testCases.forEach(({ notes, title, expected }) => {
  const detected = manager.extractPersons(notes, title).map(p => p.name);
  expected.forEach(exp => {
    assert.ok(detected.includes(exp), `Expected "${exp}" in "${notes}" (found: ${detected.join(', ')})`);
  });
});
console.log('✓ extractPersons detects Family and relation tags accurately');

// Test 3: Aggregation and Overall Family Spend Calculation
const mockExpenses = [
  { id: '1', title: 'Groceries', amount: 3000, date: '2026-11-10', notes: 'Family groceries', category: 'Food & Dining' },
  { id: '2', title: 'Electricity', amount: 1500, date: '2026-11-12', notes: 'Household electricity common', category: 'Bills & Utilities' },
  { id: '3', title: 'Recharge', amount: 299, date: '2026-11-13', notes: 'Mom mobile pack', category: 'Bills & Utilities' },
  { id: '4', title: 'Medicine', amount: 800, date: '2026-11-14', notes: 'Dad tablets', category: 'Health & Medical' },
  { id: '5', title: 'College', amount: 10000, date: '2026-11-15', notes: 'Sister semester fees', category: 'Education' },
  { id: '6', title: 'Dinner', amount: 600, date: '2026-11-16', notes: 'Dinner with friend', category: 'Food & Dining' },
  { id: '7', title: 'Book', amount: 450, date: '2026-11-16', notes: 'Myself study book', category: 'Learning & Work' }
];

window.storage.getExpenses = () => mockExpenses;

const personMap = manager.buildPersonCostMap('all');

assert.strictEqual(personMap['Family'].total, 4500, 'Family total should be 3000 + 1500 = 4500');
assert.strictEqual(personMap['Family'].count, 2, 'Family count should be 2');
assert.strictEqual(personMap['Mom'].total, 299);
assert.strictEqual(personMap['Dad'].total, 800);
assert.strictEqual(personMap['Sister'].total, 10000);
assert.strictEqual(personMap['Friend'].total, 600);
assert.strictEqual(personMap['Myself'].total, 450);

const entries = Object.values(personMap);
const totalPersonSpend = entries.reduce((s, p) => s + p.total, 0);
assert.strictEqual(totalPersonSpend, 16649, 'Total person spend matches sum');

const familyNames = new Set(['Family', 'Mom', 'Dad', 'Brother', 'Sister']);
const familySpend = entries.filter(e => familyNames.has(e.name)).reduce((s, p) => s + p.total, 0);
assert.strictEqual(familySpend, 4500 + 299 + 800 + 10000, 'Family spend is Family + Mom + Dad + Sister = 15599');
assert.strictEqual(familySpend, 15599);
console.log('✓ Overall Family Spend accurately calculates Family Common + Family Members: ₹15,599');

// Test 4: Filtering
// 4a. Filter by 'Family' strictly
manager.periodFilter = 'all';
manager.categoryFilter = 'all';
manager.searchQuery = '';
manager.selectedPersonFilter = 'Family';
let filteredFamily = manager.getFilteredExpenses();
assert.strictEqual(filteredFamily.length, 2, 'Only 2 family common expenses');
assert.ok(filteredFamily.some(e => e.title === 'Groceries'));
assert.ok(filteredFamily.some(e => e.title === 'Electricity'));
console.log('✓ Filter by "Family" strictly returns common expenses');

// 4b. Filter by 'All Family'
manager.selectedPersonFilter = 'All Family';
let filteredAllFamily = manager.getFilteredExpenses();
assert.strictEqual(filteredAllFamily.length, 5, 'All Family includes Family (2) + Mom (1) + Dad (1) + Sister (1) = 5');
assert.ok(!filteredAllFamily.some(e => e.title === 'Dinner'), 'Friend dinner must NOT be in All Family');
assert.ok(!filteredAllFamily.some(e => e.title === 'Book'), 'Myself book must NOT be in All Family');
console.log('✓ Filter by "All Family" filters both common and individual family costs while excluding non-family');

// Test 5: Check parity of files
const pExpenses = fs.readFileSync('public/js/expenses.js', 'utf8');
const dExpenses = fs.readFileSync('docs/js/expenses.js', 'utf8');
assert.strictEqual(pExpenses, dExpenses, 'public and docs expenses.js must be identical');

const pIndex = fs.readFileSync('public/index.html', 'utf8');
const dIndex = fs.readFileSync('docs/index.html', 'utf8');
assert.strictEqual(pIndex, dIndex, 'public and docs index.html must be identical');

const pApp = fs.readFileSync('public/js/app.js', 'utf8');
const dApp = fs.readFileSync('docs/js/app.js', 'utf8');
assert.strictEqual(pApp, dApp, 'public and docs app.js must be identical');

const pSw = fs.readFileSync('public/sw.js', 'utf8');
const dSw = fs.readFileSync('docs/sw.js', 'utf8');
assert.strictEqual(pSw, dSw, 'public and docs sw.js must be identical');
console.log('✓ 100% bit-for-bit parity confirmed between public/ and docs/');

console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
