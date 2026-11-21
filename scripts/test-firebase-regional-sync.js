const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running Firebase Regional Sync Engine Tests...\n');

// Mock browser environment
const localStorageData = {};
global.localStorage = {
  getItem: (k) => localStorageData[k] || null,
  setItem: (k, v) => { localStorageData[k] = String(v); },
  removeItem: (k) => { delete localStorageData[k]; },
  clear: () => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); }
};

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  location: {
    origin: 'https://mukilan-v.github.io',
    pathname: '/Spendorio.App/',
    search: '',
    hash: ''
  },
  history: {
    replaceState: (state, title, url) => {
      // Mock replaceState
      global.window.location.search = '';
    }
  },
  showToast: (msg, type) => {
    // console.log(`[Toast ${type}] ${msg}`);
  },
  storage: {
    isCurrentGuest: () => false,
    getCurrentSessionUser: () => ({
      username: 'MukilanViswa',
      fullName: 'Mukilan Viswa',
      isOwner: true
    }),
    getDeletedIds: () => new Set(),
    getTasks: () => [{ id: 'task-1', title: 'Task 1' }],
    getExpenses: () => [{ id: 'exp-1', title: 'Coffee', amount: 50, date: '2026-11-20' }],
    getIncomes: () => [],
    getSettings: () => ({ currency: '₹' }),
    saveExpenses: () => {},
    saveTasks: () => {},
    saveIncomes: () => {}
  }
};
global.navigator = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', onLine: true };
global.document = {
  readyState: 'complete',
  addEventListener: () => {},
  getElementById: () => null,
  body: { classList: { add: () => {}, remove: () => {} }, appendChild: () => {}, removeChild: () => {} }
};

// Load firebase-sync.js
const code = fs.readFileSync(path.join(__dirname, '../public/js/firebase-sync.js'), 'utf8');
eval(code);

const sync = global.window.firebaseSync;
assert(sync, 'FirebaseSync must be exposed on window.firebaseSync');

// Test 1: Regional & Legacy URL Validation
console.log('Test 1: Regional and Legacy Firebase URL Validation');
assert.strictEqual(sync.isValidFirebaseUrl('https://spendorio-rtdb.asia-southeast1.firebasedatabase.app'), true, 'Should accept asia-southeast1 firebasedatabase.app');
assert.strictEqual(sync.isValidFirebaseUrl('https://my-app-default-rtdb.europe-west1.firebasedatabase.app'), true, 'Should accept europe-west1 firebasedatabase.app');
assert.strictEqual(sync.isValidFirebaseUrl('https://spendorio-default-rtdb.firebaseio.com'), true, 'Should accept firebaseio.com');
assert.strictEqual(sync.isValidFirebaseUrl('spendorio-rtdb.asia-southeast1.firebasedatabase.app'), true, 'Should accept domain without protocol prefix');
assert.strictEqual(sync.isValidFirebaseUrl('https://example.com/database'), false, 'Should reject non-firebase domains');
assert.strictEqual(sync.isValidFirebaseUrl(''), false, 'Should reject empty string');
console.log('  ✅ Regional and legacy URL validation passed.');

// Test 2: URL Sanitization
console.log('Test 2: URL Sanitization (quotes, slashes, .json)');
assert.strictEqual(
  sync.sanitizeDbUrl('"https://my-db.asia-southeast1.firebasedatabase.app/"'),
  'https://my-db.asia-southeast1.firebasedatabase.app'
);
assert.strictEqual(
  sync.sanitizeDbUrl('http://my-db.firebaseio.com///'),
  'https://my-db.firebaseio.com'
);
assert.strictEqual(
  sync.sanitizeDbUrl('my-db.asia-southeast1.firebasedatabase.app/data.json'),
  'https://my-db.asia-southeast1.firebasedatabase.app'
);
console.log('  ✅ URL sanitization passed.');

// Test 3: Setting and Getting Database URL
console.log('Test 3: Storage and Configuration Status');
sync.setDbUrl('https://user-app.asia-southeast1.firebasedatabase.app');
assert.strictEqual(sync.getDbUrl(), 'https://user-app.asia-southeast1.firebasedatabase.app');
assert.strictEqual(sync.isConfigured(), true, 'Must report isConfigured=true for regional URL');

sync.setDbUrl('https://user-app.firebaseio.com');
assert.strictEqual(sync.getDbUrl(), 'https://user-app.firebaseio.com');
assert.strictEqual(sync.isConfigured(), true, 'Must report isConfigured=true for US URL');
console.log('  ✅ Configuration get/set passed.');

// Test 4: Strict Owner ID Resolution
console.log('Test 4: Owner ID Resolution across desktop & phone');
assert.strictEqual(sync.getCurrentUserId(), 'user_mukilan');

global.window.storage.getCurrentSessionUser = () => ({ username: 'mukilan' });
assert.strictEqual(sync.getCurrentUserId(), 'user_mukilan', 'username "mukilan" must map to user_mukilan');

global.window.storage.getCurrentSessionUser = () => ({ username: 'mukiviswa' });
assert.strictEqual(sync.getCurrentUserId(), 'user_mukilan', 'username "mukiviswa" must map to user_mukilan');

global.window.storage.getCurrentSessionUser = () => ({ email: 'mukiviswa@gmail.com', username: 'custom_muki' });
assert.strictEqual(sync.getCurrentUserId(), 'user_mukilan', 'owner email must map to user_mukilan');

global.window.storage.getCurrentSessionUser = () => null;
assert.strictEqual(sync.getCurrentUserId(), 'user_mukilan', 'offline fallback must map to user_mukilan');
console.log('  ✅ Owner ID resolution passed.');

// Test 5: Entity Merging without ID loss
console.log('Test 5: Entity Merging with ID backfill');
const local = [
  { id: '1', title: 'Lunch', amount: 150, date: '2026-11-20', updatedAt: 1000 },
  { title: 'Item without ID', amount: 200, date: '2026-11-20' } // No explicit ID
];
const cloud = [
  { id: '1', title: 'Lunch Buffet', amount: 180, date: '2026-11-20', updatedAt: 2000 }, // newer
  { id: '2', title: 'Dinner', amount: 300, date: '2026-11-20', updatedAt: 1500 }
];

const merged = sync.mergeEntitiesById(local, cloud, new Set(['deleted-xyz']));
assert.strictEqual(merged.length, 3, 'Must merge 3 unique entities without dropping missing-ID items');
const item1 = merged.find(i => String(i.id) === '1');
assert.strictEqual(item1.amount, 180, 'Must adopt newer cloud version for id 1');
const missingIdItem = merged.find(i => i.title === 'Item without ID');
assert(missingIdItem && missingIdItem.id, 'Missing ID item must be assigned deterministic ID');
console.log('  ✅ Entity merging with ID backfill passed.');

// Test 6: URL Sync Param Auto-Configuration
console.log('Test 6: Phone 1-Tap Setup URL parameter auto-configuration');
global.window.location.search = '?firebase_sync=' + encodeURIComponent('https://auto-connect-db.asia-southeast1.firebasedatabase.app');
sync.checkUrlSyncParam();
assert.strictEqual(sync.getDbUrl(), 'https://auto-connect-db.asia-southeast1.firebasedatabase.app');
assert.strictEqual(sync.isConfigured(), true);
console.log('  ✅ Phone 1-tap setup URL parameter auto-configuration passed.');

console.log('\n🎉 ALL FIREBASE REGIONAL SYNC TESTS PASSED SUCCESSFULLY!');
if (sync && sync.pollTimer) clearInterval(sync.pollTimer);
process.exit(0);
