const assert = require('assert');
const fs = require('fs');

console.log('--- RUNNING TEST SUITE: CALENDAR DATE/MONTH EXPORT & FILTER ---');

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
  addEventListener() {}
  querySelectorAll(sel) {
    return [];
  }
  querySelector(sel) {
    return new ElementMock();
  }
}

const rawElements = {};
function getOrCreate(id, tagName = 'div') {
  if (!rawElements[id]) {
    rawElements[id] = new ElementMock(id, tagName);
  }
  return rawElements[id];
}
const elements = new Proxy(rawElements, {
  get: (target, prop) => typeof prop === 'string' ? getOrCreate(prop) : target[prop]
});

global.document = {
  addEventListener() {},
  getElementById(id) {
    return elements[id];
  },
  createElement(tag) {
    return new ElementMock('', tag);
  },
  querySelector(sel) {
    return new ElementMock();
  },
  querySelectorAll(sel) {
    return [];
  },
  body: {
    appendChild(child) {},
    removeChild(child) {}
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
  charts: {
    renderAll: () => {}
  }
};

// Load storage.js
const storageCode = fs.readFileSync('public/js/storage.js', 'utf8');
eval(storageCode);

// Load expenses.js
const expensesCode = fs.readFileSync('public/js/expenses.js', 'utf8');
eval(expensesCode);

// Load app.js
const appCode = fs.readFileSync('public/js/app.js', 'utf8');
eval(appCode);

window.app = new window.Application();

// Load reports.js
const reportsCode = fs.readFileSync('public/js/reports.js', 'utf8');
eval(reportsCode);

console.log('✓ Modules loaded cleanly');

// Mock sample multi-month expense ledger
const sampleExpenses = [
  { id: '1', title: 'August Rent', amount: 15000, date: '2026-08-01', category: 'Bills & Utilities', notes: 'Rent' },
  { id: '2', title: 'August Groceries', amount: 3500, date: '2026-08-15', category: 'Groceries & Household', notes: 'Groceries' },
  { id: '3', title: 'August Dinner', amount: 1200, date: '2026-08-26', category: 'Food & Dining', notes: 'Dinner with friend' },
  { id: '4', title: 'September Books', amount: 800, date: '2026-09-10', category: 'Learning & Work', notes: 'Study' },
  { id: '5', title: 'October Medicine', amount: 450, date: '2026-10-05', category: 'Fitness & Health', notes: 'Tablets' }
];

window.storage.getExpenses = () => sampleExpenses;

const reports = window.reports || new window.ReportManager();

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Reports Calendar Month, Date, and Range Filtering
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 1: Reports Calendar Filtering ---');

// 1a. Filter by Specific Month (2026-08)
const augExpenses = reports.getFilteredExpenses('month:2026-08');
assert.strictEqual(augExpenses.length, 3, 'Should find 3 expenses in August 2026');
assert.ok(augExpenses.every(e => e.date.startsWith('2026-08')));
assert.strictEqual(reports.getPeriodLabel('month:2026-08'), 'Month 2026-08');
console.log('✓ Specific Month (2026-08) filters accurately');

// 1b. Filter by Specific Date (2026-08-26)
const dateExpenses = reports.getFilteredExpenses('date:2026-08-26');
assert.strictEqual(dateExpenses.length, 1, 'Should find 1 expense on 2026-08-26');
assert.strictEqual(dateExpenses[0].title, 'August Dinner');
assert.strictEqual(reports.getPeriodLabel('date:2026-08-26'), 'Date 2026-08-26');
console.log('✓ Specific Date (2026-08-26) filters accurately');

// 1c. Filter by Date Range (2026-08-01 to 2026-09-10)
const rangeExpenses = reports.getFilteredExpenses('range:2026-08-01:2026-09-10');
assert.strictEqual(rangeExpenses.length, 4, 'Should find 4 expenses in range');
assert.strictEqual(reports.getPeriodLabel('range:2026-08-01:2026-09-10'), 'Period 2026-08-01 to 2026-09-10');
console.log('✓ Date Range (2026-08-01 to 2026-09-10) filters accurately');

// 1d. Empty month query (e.g. 2026-12)
const emptyExpenses = reports.getFilteredExpenses('month:2026-12');
assert.strictEqual(emptyExpenses.length, 0, 'No expenses in 2026-12');
console.log('✓ Empty period returns 0 records without errors');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: UI Period Selector & Calendar Input Handlers
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 2: UI Calendar Picker Interactions ---');

// 2a. Select custom-month
window.app.handleExportPeriodChange('custom-month');
assert.strictEqual(elements['export-month-picker-wrap'].style.display, 'inline-flex');
assert.strictEqual(elements['export-date-picker-wrap'].style.display, 'none');
assert.strictEqual(elements['export-range-picker-wrap'].style.display, 'none');

elements['export-period-select'].value = 'custom-month';
elements['export-month-picker'].value = '2026-08';
assert.strictEqual(window.app.getExportSelectedPeriod(), 'month:2026-08');
console.log('✓ Custom month picker resolves to month:2026-08');

// 2b. Select custom-date
window.app.handleExportPeriodChange('custom-date');
assert.strictEqual(elements['export-date-picker-wrap'].style.display, 'inline-flex');
assert.strictEqual(elements['export-month-picker-wrap'].style.display, 'none');

elements['export-period-select'].value = 'custom-date';
elements['export-date-picker'].value = '2026-08-26';
assert.strictEqual(window.app.getExportSelectedPeriod(), 'date:2026-08-26');
console.log('✓ Custom date picker resolves to date:2026-08-26');

// 2c. Select custom-range
window.app.handleExportPeriodChange('custom-range');
assert.strictEqual(elements['export-range-picker-wrap'].style.display, 'inline-flex');

elements['export-period-select'].value = 'custom-range';
elements['export-range-from'].value = '2026-08-01';
elements['export-range-to'].value = '2026-08-31';
assert.strictEqual(window.app.getExportSelectedPeriod(), 'range:2026-08-01:2026-08-31');
console.log('✓ Custom range pickers resolve to range:2026-08-01:2026-08-31');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Expense Manager Toolbar Calendar Pickers
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 3: Expenses Tab Toolbar Calendar Interactions ---');
const expMgr = window.expenses || new ExpenseManager();

// Test custom-date on toolbar
expMgr.handlePeriodFilterChange('custom-date');
assert.strictEqual(elements['expense-date-picker-inline'].style.display, 'inline-block');
assert.strictEqual(elements['expense-month-picker-inline'].style.display, 'none');

expMgr.setPeriodFilter('date:2026-08-26');
const toolbarFiltered = expMgr.getFilteredExpenses();
assert.strictEqual(toolbarFiltered.length, 1);
assert.strictEqual(toolbarFiltered[0].title, 'August Dinner');
console.log('✓ Expenses tab toolbar custom date filter verified');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Verify PDF Staging NEVER uses offscreen left: -9999px
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 4: PDF Staging Code Inspection ---');
const reportsCodeFile = fs.readFileSync('public/js/reports.js', 'utf8');
assert.ok(!reportsCodeFile.includes("left = '-9999px'"), 'Must NOT have left: -9999px (which caused blank PDF)');
assert.ok(reportsCodeFile.includes('No expense records found'), 'Must include empty state handler for empty periods');
console.log('✓ Blank PDF defect eliminated');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Parity between public/ and docs/
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 5: Parity Check ---');
['js/reports.js', 'js/app.js', 'js/expenses.js', 'index.html', 'sw.js'].forEach(file => {
  const p = fs.readFileSync('public/' + file, 'utf8');
  const d = fs.readFileSync('docs/' + file, 'utf8');
  assert.strictEqual(p, d, `public/${file} and docs/${file} must match bit-for-bit`);
});
console.log('✓ 100% bit-for-bit parity confirmed');

console.log('=================================================================');
console.log('🎉 ALL TESTS PASSED: CALENDAR DATE/MONTH EXPORT & PDF FIX READY!');
console.log('=================================================================');
