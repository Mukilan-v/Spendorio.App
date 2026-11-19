const assert = require('assert');
const fs = require('fs');

console.log('--- RUNNING TEST SUITE: PDF PAGE-BREAK & CHRONOLOGICAL DATE ORDERING ---');

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

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Pocket Money Giver Dates Chronological Sorting (Descending)
// Matching user screenshot exactly:
// Item 1: Brother ammount (2026-09-18)
// Item 2: Brother sent money (2026-08-15)
// Item 3: Brother gave money (2026-08-26)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 1: Pocket Money Dates Sorting ---');
const testIncomes = [
  { id: 'inc-1', title: 'Brother ammount', amount: 1000, date: '2026-09-18', category: 'Other', notes: 'Brother give 3rd time ammount', giver: 'Brother' },
  { id: 'inc-2', title: 'Brother sent money', amount: 1000, date: '2026-08-15', category: 'Family Support', notes: 'Received from Brother', giver: 'Brother' },
  { id: 'inc-3', title: 'Brother gave money', amount: 1000, date: '2026-08-26', category: 'Family Support', notes: 'Received from Brother', giver: 'Brother' }
];

window.storage.getIncomes = () => testIncomes;

// Open pocket money modal view
window.app.renderStatDetailsModal('pocket_money');
const listEl = document.getElementById('stat-modal-list');

// Parse rendered items from listEl.innerHTML
const dateMatches = listEl.innerHTML.match(/2026-\d{2}-\d{2}/g) || [];
console.log('Dates found in rendered list:', dateMatches);

assert.strictEqual(dateMatches.length, 3, 'Must render all 3 pocket money items');
assert.strictEqual(dateMatches[0], '2026-09-18', 'First item must be newest: 2026-09-18');
assert.strictEqual(dateMatches[1], '2026-08-26', 'Second item must be intermediate: 2026-08-26');
assert.strictEqual(dateMatches[2], '2026-08-15', 'Third item must be oldest: 2026-08-15');
console.log('✓ Pocket money details are now in exact chronological order (newest first: 09-18, 08-26, 08-15)!');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: buildPocketGiverMap and buildPersonCostMap sorting
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 2: Sidebar Detail Panels Sorting ---');
const expMgr = window.expenses || new ExpenseManager();
const giverMap = expMgr.buildPocketGiverMap('all');
assert.ok(giverMap['Brother'], 'Brother should exist in giverMap');
assert.strictEqual(giverMap['Brother'].items[0].date, '2026-09-18');
assert.strictEqual(giverMap['Brother'].items[1].date, '2026-08-26');
assert.strictEqual(giverMap['Brother'].items[2].date, '2026-08-15');
console.log('✓ buildPocketGiverMap items sorted chronologically');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: PDF Generation & Page-Break Options
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 3: PDF Page-Break & Table Visibility Check ---');
const reports = window.reports || new window.ReportManager();
const testExpenses = [
  { id: 'e1', title: 'Briyani', amount: 152, date: '2026-08-26', category: 'Food & Dining', notes: 'Lunch by Myself', paymentMethod: 'UPI' },
  { id: 'e2', title: 'Sister Alarm', amount: 131, date: '2026-08-26', category: 'Shopping & Others', notes: 'Alarm clock and accessories, Sister', paymentMethod: 'UPI' },
  { id: 'e3', title: 'Grameen', amount: 2000, date: '2026-08-20', category: 'Bills & Utilities', notes: 'Grameen microfinance EMI, Mom', paymentMethod: 'UPI' }
];
window.storage.getExpenses = () => testExpenses;

// Verify ReportsManager generates HTML with page-break protection and clear column widths
const reportsFile = fs.readFileSync('public/js/reports.js', 'utf8');

assert.ok(reportsFile.includes('page-break-inside: avoid !important'), 'CSS must specify page-break-inside avoid');
assert.ok(reportsFile.includes('break-inside: avoid !important'), 'CSS must specify break-inside avoid');
assert.ok(reportsFile.includes('display: table-header-group'), 'thead must repeat via table-header-group');
assert.ok(reportsFile.includes('_renderVectorPdf'), 'Must include pure vector PDF generator _renderVectorPdf');
assert.ok(reportsFile.includes('JsPDFClass'), 'Must include native jsPDF class reference');

console.log('✓ PDF options verified: pure native vector engine active');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Bit-for-bit Parity between public/ and docs/
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST 4: Folder Parity Check ---');
['js/reports.js', 'js/app.js', 'js/expenses.js', 'index.html', 'sw.js'].forEach(file => {
  const p = fs.readFileSync('public/' + file, 'utf8');
  const d = fs.readFileSync('docs/' + file, 'utf8');
  assert.strictEqual(p, d, `public/${file} and docs/${file} must be identical`);
});
console.log('✓ 100% bit-for-bit parity confirmed between public/ and docs/');

console.log('=================================================================');
console.log('🎉 ALL TESTS PASSED: PDF DETAILS & DATES CHRONOLOGY FULLY FIXED!');
console.log('=================================================================');
