const fs = require('fs');
const assert = require('assert');

// 1. Mock browser environment
global.self = global;
global.window = global;
global.window.addEventListener = () => {};
global.location = { protocol: 'https:', href: 'https://localhost/', search: '' };
global.window.location = global.location;
global.document = {
  createElement: (tag) => ({
    style: {},
    appendChild: () => {},
    removeChild: () => {},
    click: () => {},
    setAttribute: () => {}
  }),
  body: { appendChild: () => {}, removeChild: () => {} },
  querySelectorAll: () => [],
  addEventListener: () => {}
};
global.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
global.Blob = function(parts, opts) {
  this.parts = parts;
  this.opts = opts || {};
  this.text = parts.join('');
};
global.navigator = { userAgent: 'Node' };

const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => {}
};

// 2. Load storage, bundle, expenses, and reports
eval(fs.readFileSync('public/js/storage.js', 'utf8'));
eval(fs.readFileSync('public/js/html2pdf.bundle.min.js', 'utf8'));
eval(fs.readFileSync('public/js/expenses.js', 'utf8'));
eval(fs.readFileSync('public/js/reports.js', 'utf8'));

console.log('--- TEST: VERIFYING ALL EXPORT FORMATS ---');

const sampleExpenses = [
  { id: 'e1', date: '2026-08-26', title: 'Briyani', amount: 152, category: 'Food & Dining', notes: 'Lunch by Myself', paymentMethod: 'UPI' },
  { id: 'e2', date: '2026-08-26', title: 'Sister Alarm', amount: 131, category: 'Shopping & Others', notes: 'Alarm clock, Sister', paymentMethod: 'UPI' },
  { id: 'e3', date: '2026-08-20', title: 'Grameen', amount: 2000, category: 'Bills & Utilities', notes: 'EMI, Mom', paymentMethod: 'UPI' },
  { id: 'e4', date: '2026-09-18', title: 'Brother amount', amount: 1000, category: 'Other', notes: 'Brother gave money', paymentMethod: 'Cash' }
];

const sampleIncomes = [
  { id: 'i1', date: '2026-08-01', title: 'Monthly Salary', amount: 45000, category: 'Salary' }
];

window.storage.getExpenses = () => sampleExpenses;
window.storage.getIncomes = () => sampleIncomes;
window.storage.getCurrencySymbol = () => '₹';

const reports = window.reports;
const capturedDownloads = {};

reports.triggerBlobDownload = (blob, filename) => {
  capturedDownloads[filename] = blob;
};

// =========================================================================
// 1. TEST EXCEL SPREADSHEET (.xls)
// =========================================================================
console.log('\n[1/6] Testing Excel Spreadsheet (.xls)...');
reports.downloadExcel('all');
const excelFile = Object.keys(capturedDownloads).find(k => k.endsWith('.xls'));
assert.ok(excelFile, 'Excel file must be downloaded');
const excelBlob = capturedDownloads[excelFile];
assert.strictEqual(excelBlob.opts.type, 'application/vnd.ms-excel;charset=utf-8');
assert.ok(excelBlob.text.includes('urn:schemas-microsoft-com:office:excel'), 'Excel XML namespace present');
assert.ok(excelBlob.text.includes('Briyani'), 'Contains Briyani expense');
assert.ok(excelBlob.text.includes('Sister Alarm'), 'Contains Sister Alarm expense');
assert.ok(excelBlob.text.includes('Grameen'), 'Contains Grameen expense');
assert.ok(excelBlob.text.includes('Sister'), 'Contains beneficiary Sister');
assert.ok(excelBlob.text.includes('Mom'), 'Contains beneficiary Mom');
assert.ok(excelBlob.text.includes('Myself'), 'Contains beneficiary Myself');
assert.ok(excelBlob.text.includes('SUM(G'), 'Contains dynamic Excel SUM formula');
console.log(`✓ Excel (.xls) verified successfully: ${excelFile} (${excelBlob.text.length} bytes)`);

// =========================================================================
// 2. TEST WORD DOCUMENT (.doc)
// =========================================================================
console.log('\n[2/6] Testing Word Document (.doc)...');
reports.downloadWord('all');
const wordFile = Object.keys(capturedDownloads).find(k => k.endsWith('.doc'));
assert.ok(wordFile, 'Word file must be downloaded');
const wordBlob = capturedDownloads[wordFile];
assert.strictEqual(wordBlob.opts.type, 'application/msword;charset=utf-8');
assert.ok(wordBlob.text.includes('urn:schemas-microsoft-com:office:word'), 'Word XML namespace present');
assert.ok(wordBlob.text.includes('Briyani'), 'Contains Briyani expense');
assert.ok(wordBlob.text.includes('Sister Alarm'), 'Contains Sister Alarm');
assert.ok(wordBlob.text.includes('Beneficiary Breakdown') || wordBlob.text.includes('Beneficiary / Individual'), 'Contains beneficiary breakdown');
assert.ok(wordBlob.text.includes('3,283') || wordBlob.text.includes('3283'), 'Contains total spent');
console.log(`✓ Word Document (.doc) verified successfully: ${wordFile} (${wordBlob.text.length} bytes)`);

// =========================================================================
// 3. TEST CSV DATA FILE (.csv)
// =========================================================================
console.log('\n[3/6] Testing CSV Data File (.csv)...');
reports.downloadCSV('all');
const csvFile = Object.keys(capturedDownloads).find(k => k.endsWith('.csv'));
assert.ok(csvFile, 'CSV file must be downloaded');
const csvBlob = capturedDownloads[csvFile];
assert.strictEqual(csvBlob.opts.type, 'text/csv;charset=utf-8');
assert.ok(csvBlob.text.startsWith('\uFEFF'), 'CSV must include UTF-8 BOM for Microsoft Excel');
assert.ok(csvBlob.text.includes('#,ID,Date,Title,Category,Beneficiary,Amount,Payment Method,Notes'), 'CSV contains proper headers');
assert.ok(csvBlob.text.includes('"Briyani"'), 'CSV contains escaped Briyani');
assert.ok(csvBlob.text.includes('"Sister"'), 'CSV contains Sister beneficiary');
assert.ok(csvBlob.text.includes('"Mom"'), 'CSV contains Mom beneficiary');
console.log(`✓ CSV Data File (.csv) verified successfully: ${csvFile} (${csvBlob.text.length} bytes)`);

// =========================================================================
// 4. TEST PLAIN TEXT SUMMARY (.txt)
// =========================================================================
console.log('\n[4/6] Testing Plain Text Summary (.txt)...');
reports.downloadText('all');
const txtFile = Object.keys(capturedDownloads).find(k => k.endsWith('.txt'));
assert.ok(txtFile, 'Text file must be downloaded');
const txtBlob = capturedDownloads[txtFile];
assert.strictEqual(txtBlob.opts.type, 'text/plain;charset=utf-8');
assert.ok(txtBlob.text.toUpperCase().includes('EXPENSE STATEMENT'), 'Text contains statement title');
assert.ok(txtBlob.text.toUpperCase().includes('INDIVIDUAL BENEFICIARY BREAKDOWN'), 'Text contains beneficiary breakdown');
assert.ok(txtBlob.text.toUpperCase().includes('DETAILED EXPENSE LEDGER'), 'Text contains expense ledger');
assert.ok(txtBlob.text.includes('Briyani'), 'Text contains Briyani');
assert.ok(txtBlob.text.includes('Sister Alarm'), 'Text contains Sister Alarm');
assert.ok(txtBlob.text.includes('GRAND TOTAL'), 'Text contains GRAND TOTAL');
console.log(`✓ Plain Text (.txt) verified successfully: ${txtFile} (${txtBlob.text.length} bytes)`);

// =========================================================================
// 5. TEST NATIVE VECTOR PDF (.pdf)
// =========================================================================
console.log('\n[5/6] Testing Native Vector PDF (.pdf)...');
const JsPDFClass = window.jsPDF;
assert.strictEqual(typeof JsPDFClass, 'function', 'jsPDF class must be available');
const pdfDoc = new JsPDFClass({ orientation: 'portrait', unit: 'mm', format: 'a4' });
reports._renderVectorPdf(pdfDoc, {
  periodLabel: 'All-Time Total',
  nowStr: new Date().toLocaleString(),
  currency: '₹',
  totalSpent: 3283,
  totalIncome: 45000,
  netBalance: 41717,
  persons: reports.getPersonBreakdown(sampleExpenses),
  categories: reports.getCategoryBreakdown(sampleExpenses),
  expenses: sampleExpenses
});
const pdfOutput = pdfDoc.output();
assert.ok(pdfOutput.startsWith('%PDF-'), 'Valid PDF file format header');
assert.ok(pdfOutput.length > 2000, 'Non-empty vector PDF output');
assert.ok(pdfOutput.includes('SPENDORIO'), 'Contains SPENDORIO title');
assert.ok(pdfOutput.includes('TOTAL EXPENSES'), 'Contains TOTAL EXPENSES card');
assert.ok(pdfOutput.includes('Page 1 of 1'), 'Contains pagination');
console.log(`✓ Native Vector PDF (.pdf) verified successfully (${pdfOutput.length} bytes)`);

// =========================================================================
// 6. TEST FULL JSON BACKUP (.json)
// =========================================================================
console.log('\n[6/6] Testing Full JSON Backup (.json)...');
const jsonData = window.storage.exportAllDataJSON();
assert.ok(jsonData, 'JSON data must be exported');
const parsed = JSON.parse(jsonData);
assert.strictEqual(parsed.version, '1.0.0');
assert.ok(Array.isArray(parsed.expenses), 'Expenses is array in JSON');
assert.strictEqual(parsed.expenses.length, 4);
assert.ok(Array.isArray(parsed.incomes), 'Incomes is array in JSON');
console.log(`✓ Full JSON Backup (.json) verified successfully (${jsonData.length} bytes)`);

console.log('\n=================================================================');
console.log('🎉 ALL EXPORT FORMATS VERIFIED & WORKING 100% PERFECTLY!');
console.log('=================================================================');
