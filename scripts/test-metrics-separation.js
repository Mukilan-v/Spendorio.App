const fs = require('fs');
const assert = require('assert');

// 1. Test parity between public/ and docs/
const filesToCompare = [
  'index.html',
  'sw.js',
  'js/app.js',
  'js/expenses.js',
  'js/storage.js'
];

for (const f of filesToCompare) {
  const pub = fs.readFileSync('public/' + f, 'utf8');
  const doc = fs.readFileSync('docs/' + f, 'utf8');
  assert.strictEqual(pub, doc, `Mismatch in public/${f} and docs/${f}!`);
}
console.log('✅ File parity check PASSED: public/ and docs/ are 100% in sync!');

// 2. Test isPocketMoney logic with mock storage
const storageCode = fs.readFileSync('public/js/storage.js', 'utf8');
const appCode = fs.readFileSync('public/js/app.js', 'utf8');

// Extract isPocketMoney function implementation from app.js
const isPocketMoneyMatch = appCode.match(/isPocketMoney\(inc\)\s*\{([\s\S]*?)\n  \}/);
assert(isPocketMoneyMatch, 'isPocketMoney method not found in app.js!');
const isPocketMoneyFn = new Function('inc', isPocketMoneyMatch[1]);

// Test Mukilan's seed incomes
// Extract seed incomes from storage.js
const seedIncomesMatch = storageCode.match(/const incomes = (\[[\s\S]*?\]);/);
assert(seedIncomesMatch, 'Seed incomes array not found in storage.js!');
const seedIncomes = eval(seedIncomesMatch[1]);

console.log(`\nEvaluating ${seedIncomes.length} seed incomes from Mukilan:`);
let totalPocket = 0;
let totalEarned = 0;
let pocketCount = 0;
let earnedCount = 0;

seedIncomes.forEach(inc => {
  const isPocket = isPocketMoneyFn(inc);
  const amt = parseFloat(inc.amount) || 0;
  console.log(` - [${isPocket ? 'POCKET' : 'EARNED'}] "${inc.title}" (Cat: ${inc.category || 'none'}): ₹${amt}`);
  if (isPocket) {
    totalPocket += amt;
    pocketCount++;
  } else {
    totalEarned += amt;
    earnedCount++;
  }
});

console.log(`\nResults:`);
console.log(`• Card 3: Total Incomes (Earned): ₹${totalEarned.toLocaleString()} (${earnedCount} records)`);
console.log(`• Card 6: Family Support & Pocket Money: ₹${totalPocket.toLocaleString()} (${pocketCount} records)`);

// Seed incomes total ₹13,000 or ₹14,000 depending on storage.js seed
assert.strictEqual(earnedCount, 0, 'Seed incomes should have 0 earned income records!');
assert.strictEqual(totalEarned, 0, 'Seed incomes should have ₹0 earned income!');
assert(totalPocket > 0, 'Total pocket money should be > 0');

// Test scenario: adding earned income
const testSalary = { title: 'October Salary', amount: 35000, category: 'Salary', isPocketMoney: false };
assert.strictEqual(isPocketMoneyFn(testSalary), false, 'Salary should NOT be pocket money');

// Test scenario: adding pocket money
const testPocket = { title: 'Sister college support', amount: 500, category: 'Family Support', giver: 'Sister', isPocketMoney: true };
assert.strictEqual(isPocketMoneyFn(testPocket), true, 'Family support should be pocket money');

console.log('\n✅ All automated verification tests PASSED with 100% precision!');
