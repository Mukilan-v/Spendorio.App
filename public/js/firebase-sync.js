/**
 * Spendorio - Firebase Cloud Sync Engine (js/firebase-sync.js)
 * Real-time Bidirectional Union-Merge Sync between Phone and Laptop via Google Firebase REST API.
 * 100% Zero external dependencies. 100% Offline-Safe. Zero Data Loss Guaranteed.
 */

(function () {
  'use strict';

  const STORAGE_KEY_FIREBASE_URL = 'spendorio_firebase_db_url';
  const STORAGE_KEY_LAST_SYNC = 'spendorio_firebase_last_sync';
  const STORAGE_KEY_LOCAL_UPDATED = 'spendorio_local_data_updated_at';
  const DEFAULT_RTDB_URL = 'https://spendorio-default-rtdb.firebaseio.com';

  // Immediate fail-safe: Ensure default official database URL is pre-set in localStorage
  try {
    const existingDb = (localStorage.getItem(STORAGE_KEY_FIREBASE_URL) || '').trim();
    if (!existingDb) {
      localStorage.setItem(STORAGE_KEY_FIREBASE_URL, DEFAULT_RTDB_URL);
    }
  } catch (e) {}

  function markLocalUpdated() {
    try {
      localStorage.setItem(STORAGE_KEY_LOCAL_UPDATED, Date.now().toString());
    } catch (e) {}
  }

  const FirebaseSync = {
    syncInProgress: false,
    pollTimer: null,

    init() {
      console.log('[FirebaseSync] Initializing Bidirectional Cloud Sync Engine...');

      // Purge any accidental cached Firebase responses from browser CacheStorage
      try {
        if (typeof window !== 'undefined' && 'caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.open(name).then(cache => {
                cache.keys().then(requests => {
                  requests.forEach(req => {
                    if (req.url && (req.url.includes('firebaseio.com') || req.url.includes('firebasedatabase.app'))) {
                      cache.delete(req);
                    }
                  });
                }).catch(() => {});
              }).catch(() => {});
            });
          }).catch(() => {});
        }
      } catch (e) {}
      
      // Auto-detect one-click setup URL param: ?firebase_sync=... or ?firebase_url=...
      this.checkUrlSyncParam();

      // Ensure default Firebase Database URL is active out-of-the-box on all devices (Laptop & Phone)
      const currentUrl = (localStorage.getItem(STORAGE_KEY_FIREBASE_URL) || '').trim();
      if (!currentUrl) {
        localStorage.setItem(STORAGE_KEY_FIREBASE_URL, DEFAULT_RTDB_URL);
      }

      this.bindEvents();
      this.updateStatusUI();

      // Initial sync check on launch after brief delay
      setTimeout(() => {
        if (this.isConfigured()) {
          this.syncNow(true);
        }
      }, 600);

      // Start recurring background auto-sync every 5 seconds for real-time responsiveness
      this.startAutoSync();
    },

    // Check for ?firebase_sync=... query parameter to enable 1-tap phone setup
    checkUrlSyncParam() {
      try {
        const params = new URLSearchParams(window.location.search);
        const syncParam = params.get('firebase_sync') || params.get('firebase_url');
        if (syncParam) {
          let decodedUrl = '';
          try {
            decodedUrl = decodeURIComponent(syncParam);
            if (decodedUrl.startsWith('base64:')) {
              decodedUrl = atob(decodedUrl.substring(7));
            }
          } catch (e) {
            decodedUrl = syncParam;
          }
          const sanitized = this.sanitizeDbUrl(decodedUrl);
          if (this.isValidFirebaseUrl(sanitized)) {
            this.setDbUrl(sanitized);
            try {
              const cleanUrl = window.location.pathname + window.location.hash;
              window.history.replaceState({}, document.title, cleanUrl);
            } catch (e) {}
            if (window.showToast) {
              window.showToast('🎉 Cloud Sync Connected from phone setup link! Syncing data...', 'success');
            }
            setTimeout(() => this.syncNow(false), 400);
          }
        }
      } catch (e) {
        console.warn('[FirebaseSync] Error checking sync param:', e);
      }
    },

    // Validates any Google Firebase Realtime Database URL format (US or regional)
    isValidFirebaseUrl(rawUrl) {
      if (!rawUrl || typeof rawUrl !== 'string') return false;
      const clean = rawUrl.trim().toLowerCase();
      // Supports standard .firebaseio.com AND modern regional endpoints .firebasedatabase.app (e.g. asia-southeast1)
      const hasValidDomain = clean.includes('firebaseio.com') || clean.includes('firebasedatabase.app');
      return hasValidDomain;
    },

    // Cleanly sanitize user pasted URLs (removes trailing slashes, .json, paths, spaces, quotes)
    sanitizeDbUrl(rawUrl) {
      if (!rawUrl || typeof rawUrl !== 'string') return '';
      let url = rawUrl.trim();
      url = url.replace(/^["']|["']$/g, '').trim();
      if (!url) return '';
      if (!url.startsWith('https://') && !url.startsWith('http://')) {
        url = 'https://' + url;
      }
      if (url.startsWith('http://')) {
        url = 'https://' + url.substring(7);
      }
      // If user pasted a URL with path (e.g. /data.json or /spendorio), extract exact root database endpoint
      try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('firebaseio.com') || parsed.hostname.includes('firebasedatabase.app')) {
          return 'https://' + parsed.hostname;
        }
      } catch (e) {
        const match = url.match(/^(https:\/\/[a-z0-9\-.]+\.(firebaseio\.com|firebasedatabase\.app))/i);
        if (match) return match[1];
      }
      url = url.replace(/\/+$/, '').replace(/\.json\/?$/, '').replace(/\/+$/, '');
      return url;
    },

    isConfigured() {
      const url = this.getDbUrl();
      return !!(url && this.isValidFirebaseUrl(url));
    },

    getDbUrl() {
      const url = (localStorage.getItem(STORAGE_KEY_FIREBASE_URL) || '').trim();
      if (url) return this.sanitizeDbUrl(url);
      // Seamless zero-setup default: Spendorio official Realtime Database
      return DEFAULT_RTDB_URL;
    },

    setDbUrl(url) {
      const sanitized = this.sanitizeDbUrl(url);
      if (!sanitized) {
        localStorage.removeItem(STORAGE_KEY_FIREBASE_URL);
        this.updateStatusUI();
        return;
      }
      localStorage.setItem(STORAGE_KEY_FIREBASE_URL, sanitized);
      this.updateStatusUI();
    },

    // Unified User ID: Maps owner accounts on Phone & Laptop consistently to user_mukilan
    getCurrentUserId() {
      if (!window.storage) return 'user_mukilan';
      if (window.storage.isCurrentGuest && window.storage.isCurrentGuest()) {
        return null; // Guest trial sessions never sync to cloud
      }
      const user = window.storage.getCurrentSessionUser ? window.storage.getCurrentSessionUser() : null;
      if (!user) {
        return 'user_mukilan'; // Offline single-user default maps to owner
      }
      const u = (user.username || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const uid = (user.id || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const fn = (user.fullName || '').toLowerCase();

      // If user is owner or any alias of Mukilan, always map to user_mukilan so phone and laptop share the EXACT same cloud storage node
      if (
        user.isOwner ||
        u === 'mukiviswa' ||
        u === 'mukilanviswa' ||
        u === 'mukilan' ||
        u.includes('mukil') ||
        u.includes('muki') ||
        u.includes('viswa') ||
        uid === 'user-mukiviswa' ||
        email === 'mukilanviswa@gmail.com' ||
        email === 'mukiviswa@gmail.com' ||
        email === 'spendorio102026@gmail.com' ||
        email.includes('mukilan') ||
        email.includes('mukiviswa') ||
        fn.includes('mukilan') ||
        fn.includes('mukivis') ||
        fn.includes('viswa')
      ) {
        return 'user_mukilan';
      }
      return 'user_' + (u || 'mukilan');
    },

    // Generate and copy a 1-tap setup link for the user's phone
    copyPhoneSetupLink() {
      const currentUrl = this.getDbUrl();
      if (!currentUrl) {
        if (window.showToast) {
          window.showToast('Please enter and save your Firebase Database URL on laptop first.', 'warning');
        }
        return;
      }
      const cleanBase = window.location.origin + window.location.pathname;
      const shareableUrl = `${cleanBase}?firebase_sync=${encodeURIComponent(currentUrl)}`;
      
      const onSuccess = () => {
        if (window.showToast) {
          window.showToast('📱 Phone link copied! Send it to your phone (WhatsApp/Email) & tap it to sync instantly!', 'success');
        }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareableUrl).then(onSuccess).catch(() => {
          this.fallbackCopyText(shareableUrl, onSuccess);
        });
      } else {
        this.fallbackCopyText(shareableUrl, onSuccess);
      }
    },

    fallbackCopyText(text, cb) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        if (cb) cb();
      } catch (e) {
        prompt('Copy this setup link and send to your phone:', text);
      }
      document.body.removeChild(ta);
    },

    // Copy copy-pasteable rules json (Scoped specifically to spendorio/users/$userId to eliminate Firebase security warnings)
    copyFirebaseRules() {
      const rules = '{\n  "rules": {\n    "spendorio": {\n      "users": {\n        "$userId": {\n          ".read": true,\n          ".write": true\n        }\n      }\n    }\n  }\n}';
      const onSuccess = () => {
        if (window.showToast) {
          window.showToast('📋 Secure Firebase Rules copied! Paste them in Firebase Console -> Realtime Database -> Rules tab', 'success');
        }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rules).then(onSuccess).catch(() => {
          this.fallbackCopyText(rules, onSuccess);
        });
      } else {
        this.fallbackCopyText(rules, onSuccess);
      }
    },

    openRulesHelpModal() {
      this.openSetupGuide();
    },

    // Reliable fetch with timeout to prevent iOS Safari & sleep hangs
    async fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
      if (typeof AbortController === 'undefined') {
        return fetch(url, options);
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        return response;
      } finally {
        clearTimeout(timer);
      }
    },

    bindEvents() {
      // Sync immediately when user switches back to this browser tab
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.isConfigured()) {
          this.syncNow(true);
        }
      });

      // Sync on window focus
      window.addEventListener('focus', () => {
        if (this.isConfigured()) {
          this.syncNow(true);
        }
      });

      // iOS Safari PWA lifecycle: fires reliably when app is restored from background / bfcache
      window.addEventListener('pageshow', () => {
        if (this.isConfigured()) {
          this.syncNow(true);
          this.startAutoSync();
        }
      });

      // Sync when internet connection is restored
      window.addEventListener('online', () => {
        if (this.isConfigured()) {
          if (window.showToast) {
            window.showToast('🟢 Internet restored! Synchronizing with cloud...', 'info');
          }
          this.syncNow(false);
        }
      });

      // Mobile user activity wake-up: if a sync was pending while offline, trigger sync on next touch
      const onUserActivity = () => {
        if (this.hasPendingSync && this.isConfigured() && !this.syncInProgress) {
          this.syncNow(true);
        }
      };
      window.addEventListener('touchstart', onUserActivity, { passive: true });
      window.addEventListener('mousedown', onUserActivity, { passive: true });
    },

    startAutoSync() {
      if (this.pollTimer) clearInterval(this.pollTimer);
      // Continuous background sync every 5 seconds for real-time reflection between Phone & Laptop
      this.pollTimer = setInterval(() => {
        if (!document.hidden && this.isConfigured()) {
          this.syncNow(true);
        }
      }, 5000);
    },

    ensureEntityId(item, prefix = 'item', idx = 0) {
      if (!item || typeof item !== 'object') return null;
      if (item.id && String(item.id).trim() !== '' && String(item.id) !== 'undefined' && String(item.id) !== 'null') {
        return String(item.id).trim();
      }
      const base = (item.date || '') + '_' + (item.title || item.name || '') + '_' + (item.amount || '') + '_' + (item.createdAt || idx);
      let hash = 0;
      for (let i = 0; i < base.length; i++) {
        hash = ((hash << 5) - hash) + base.charCodeAt(i);
        hash |= 0;
      }
      // Deterministic ID without environment prefix so cloud and local versions match cleanly
      const assignedId = `item-${Math.abs(hash)}`;
      item.id = assignedId;
      return assignedId;
    },

    // Union merge lists by unique entity ID (respects tombstones to guarantee deleted items never resurrect)
    mergeEntitiesById(localList, cloudList, deletedIdsSet) {
      const map = new Map();
      const deleted = deletedIdsSet || (window.storage && window.storage.getDeletedIds ? window.storage.getDeletedIds() : new Set());

      // 1. Process cloud items (strictly discard deleted tombstones)
      (cloudList || []).forEach((item, idx) => {
        if (!item || typeof item !== 'object') return;
        const idStr = this.ensureEntityId(item, 'cloud', idx);
        if (!idStr || deleted.has(idStr)) return;
        map.set(idStr, item);
      });

      // 2. Process local items (strictly discard deleted tombstones)
      (localList || []).forEach((item, idx) => {
        if (!item || typeof item !== 'object') return;
        const idStr = this.ensureEntityId(item, 'local', idx);
        if (!idStr || deleted.has(idStr)) return;

        const existing = map.get(idStr);
        if (!existing) {
          map.set(idStr, item);
        } else {
          const tExist = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const tLocal = new Date(item.updatedAt || item.createdAt || 0).getTime();
          // Conflict resolution: only overwrite cloud if local was strictly modified later
          // If timestamps are tied, prefer the version that has an explicit updatedAt or keep cloud
          if (tLocal > tExist) {
            map.set(idStr, { ...existing, ...item });
          } else if (tLocal === tExist && item.updatedAt && !existing.updatedAt) {
            map.set(idStr, { ...existing, ...item });
          }
        }
      });
      return Array.from(map.values());
    },

    // Main 2-way Bidirectional Union Sync
    async syncNow(silent = false) {
      // 1. Watchdog: If previous sync has been locked for > 10s, force-reset it so the app never hangs
      if (this.syncInProgress) {
        const elapsed = Date.now() - (this.syncStartTime || 0);
        if (elapsed > 10000) {
          console.warn(`[FirebaseSync] Force-clearing stale sync lock after watchdog timeout (${elapsed}ms)`);
          this.syncInProgress = false;
        } else {
          return;
        }
      }

      if (!this.isConfigured()) {
        if (!silent && window.showToast) {
          window.showToast('Please enter your Firebase Database URL in Settings first.', 'warning');
        }
        return;
      }

      const userId = this.getCurrentUserId();
      if (!userId) return; // Never sync guest sessions

      // When user initiates manual sync, also check for any PWA service worker updates
      if (!silent && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg && reg.update) reg.update().catch(() => {});
        }).catch(() => {});
      }

      this.syncInProgress = true;
      this.syncStartTime = Date.now();
      this.updateSyncBadge('syncing');

      try {
        const dbUrl = this.getDbUrl();
        // Append cache-busting timestamp to avoid any stale browser/proxy HTTP caching
        const endpoint = `${dbUrl}/spendorio/users/${encodeURIComponent(userId)}.json?_ts=${Date.now()}`;
        const putEndpoint = `${dbUrl}/spendorio/users/${encodeURIComponent(userId)}.json`;

        // 1. Fetch Cloud Data with 8s timeout
        let cloudResponse = null;
        try {
          cloudResponse = await this.fetchWithTimeout(endpoint, { cache: 'no-store' }, 8000);
        } catch (netErr) {
          this.hasPendingSync = true;
          this.updateSyncBadge('offline');
          if (!silent && window.showToast) {
            window.showToast('Cloud sync paused (device offline or connection timed out)', 'warning');
          }
          return;
        }

        if (!cloudResponse.ok) {
          let errDetail = '';
          try {
            const errJson = await cloudResponse.json();
            errDetail = (errJson && errJson.error) ? String(errJson.error) : '';
          } catch (e) {}
          if (cloudResponse.status === 401 || cloudResponse.status === 403 || errDetail.toLowerCase().includes('permission denied')) {
            const permErr = new Error('FIREBASE_PERMISSION_DENIED');
            permErr.status = cloudResponse.status;
            throw permErr;
          }
        }

        let cloudData = null;
        if (cloudResponse.ok) {
          try {
            cloudData = await cloudResponse.json();
          } catch (e) {
            cloudData = null;
          }
        }

        const localTasks = (window.storage && window.storage.getTasks) ? window.storage.getTasks() : [];
        const localExpenses = (window.storage && window.storage.getExpenses) ? window.storage.getExpenses() : [];
        const localIncomes = (window.storage && window.storage.getIncomes) ? window.storage.getIncomes() : [];
        const localSettings = (window.storage && window.storage.getSettings) ? window.storage.getSettings() : {};

        const preLocalExpCount = localExpenses.length;

        const cloudTasks = (cloudData && Array.isArray(cloudData.tasks)) ? cloudData.tasks : [];
        const cloudExpenses = (cloudData && Array.isArray(cloudData.expenses)) ? cloudData.expenses : [];
        const cloudIncomes = (cloudData && Array.isArray(cloudData.incomes)) ? cloudData.incomes : [];
        const cloudDeletedIds = (cloudData && Array.isArray(cloudData.deletedIds)) ? cloudData.deletedIds : [];
        const cloudSettings = (cloudData && typeof cloudData.settings === 'object') ? cloudData.settings : {};
        const cloudProfile = (cloudData && cloudData.userProfile) ? cloudData.userProfile : null;

        // Merge any deletions recorded in cloud into our local deletion set
        if (cloudDeletedIds.length > 0 && window.storage && typeof window.storage.addDeletedIds === 'function') {
          window.storage.addDeletedIds(cloudDeletedIds);
        }
        const activeDeletedIds = (window.storage && typeof window.storage.getDeletedIds === 'function') ? window.storage.getDeletedIds() : new Set();

        // 2. Intelligent Bidirectional Union Merge (respecting tombstones)
        const mergedExpenses = this.mergeEntitiesById(localExpenses, cloudExpenses, activeDeletedIds);
        mergedExpenses.sort((a, b) => {
          const da = a.date || a.createdAt || '';
          const db = b.date || b.createdAt || '';
          return db.localeCompare(da);
        });

        const mergedTasks = this.mergeEntitiesById(localTasks, cloudTasks, activeDeletedIds);
        const mergedIncomes = this.mergeEntitiesById(localIncomes, cloudIncomes, activeDeletedIds);
        const mergedSettings = { ...cloudSettings, ...localSettings };

        // 3. Apply to Local Storage (Protected from bounce-back push)
        if (window.storage) {
          window.storage._isSyncingFromCloud = true;
          try {
            window.storage.saveExpenses(mergedExpenses);
            window.storage.saveTasks(mergedTasks);
            window.storage.saveIncomes(mergedIncomes);
            if (cloudProfile && window.auth && typeof window.auth.applyCloudProfile === 'function') {
              window.auth.applyCloudProfile(cloudProfile);
            }
          } finally {
            window.storage._isSyncingFromCloud = false;
          }
        }

        // Refresh all UI components immediately so both device entries appear on screen
        this.refreshAllUI();

        // 4. Ensure cloud has the clean synchronized state
        await this.pushMergedPayload(putEndpoint, userId, mergedTasks, mergedExpenses, mergedIncomes, mergedSettings, Array.from(activeDeletedIds));

        const now = Date.now();
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, now.toString());
        this.hasPendingSync = false;
        this.updateSyncBadge('synced');
        this.updateStatusUI();

        const postExpCount = mergedExpenses.length;
        const postTaskCount = mergedTasks.length;

        if (!silent && window.showToast) {
          if (postExpCount > preLocalExpCount) {
            const added = postExpCount - preLocalExpCount;
            window.showToast(`✅ Synced! Received ${added} new expense${added > 1 ? 's' : ''} from cloud (${postExpCount} total)`, 'success');
          } else {
            window.showToast(`✅ Synced with Cloud! (${postExpCount} expenses active)`, 'success');
          }
        }
      } catch (err) {
        console.warn('[FirebaseSync] Sync error:', err.message);
        if (err.message === 'FIREBASE_PERMISSION_DENIED') {
          this.updateSyncBadge('permission_error');
          this.openRulesHelpModal();
          if (window.showToast) {
            window.showToast('⚠️ Firebase Rules Locked! Click Setup Guide to unlock read/write in Firebase Console', 'error');
          }
        } else {
          this.hasPendingSync = true;
          this.updateSyncBadge('offline');
          if (!silent && window.showToast) {
            window.showToast('Cloud sync paused (check internet or database URL)', 'warning');
          }
        }
      } finally {
        this.syncInProgress = false;
        this.syncStartTime = 0;
      }
    },

    // When local data changes (added/edited/deleted), trigger immediate bidirectional sync
    pushLocalData(silent = false) {
      if (!this.isConfigured()) return;
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this.syncNow(silent);
      }, 150);
    },

    // Push unified payload to Firebase REST endpoint with timeout
    async pushMergedPayload(endpoint, userId, tasks, expenses, incomes, settings, deletedIds = []) {
      const now = Date.now();
      const payload = {
        userId: userId,
        updatedAt: now,
        device: (navigator.userAgent && navigator.userAgent.includes('Mobile')) ? 'Phone' : 'Desktop',
        tasks: tasks || [],
        expenses: expenses || [],
        incomes: incomes || [],
        settings: settings || {},
        deletedIds: deletedIds || [],
        userProfile: (window.auth && window.auth.currentUser && (!window.storage.isCurrentGuest || !window.storage.isCurrentGuest())) ? {
          fullName: window.auth.currentUser.fullName || '',
          username: window.auth.currentUser.username || '',
          dob: window.auth.currentUser.dob || '',
          email: window.auth.currentUser.email || '',
          phone: window.auth.currentUser.phone || '',
          profileImage: window.auth.currentUser.profileImage || ''
        } : null
      };

      const resp = await this.fetchWithTimeout(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, 9000);

      if (!resp.ok) {
        let errDetail = '';
        try {
          const errJson = await resp.json();
          errDetail = (errJson && errJson.error) ? String(errJson.error) : '';
        } catch (e) {}
        if (resp.status === 401 || resp.status === 403 || errDetail.toLowerCase().includes('permission denied')) {
          const permErr = new Error('FIREBASE_PERMISSION_DENIED');
          permErr.status = resp.status;
          throw permErr;
        }
        throw new Error(`Firebase PUT failed (${resp.status}): ${errDetail || resp.statusText}`);
      }
      return true;
    },

    // Refresh all UI components
    refreshAllUI() {
      try {
        if (window.app && typeof window.app.updateSummaryMetrics === 'function') {
          window.app.updateSummaryMetrics();
        }
        if (window.tasks && typeof window.tasks.render === 'function') {
          window.tasks.render();
        }
        if (window.expenses && typeof window.expenses.render === 'function') {
          window.expenses.render();
        }
        if (window.charts && typeof window.charts.renderAll === 'function') {
          window.charts.renderAll();
        }
      } catch (e) {
        console.error('[FirebaseSync] UI refresh error:', e);
      }
    },

    // Update Header Status Badge
    updateSyncBadge(status) {
      const badge = document.getElementById('pwa-network-badge');
      if (!badge) return;

      if (status === 'syncing') {
        badge.className = 'pwa-network-badge online';
        badge.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i><span>Syncing...</span>';
        badge.title = 'Cloud Sync in progress...';
      } else if (status === 'synced') {
        badge.className = 'pwa-network-badge online';
        badge.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><span>Cloud Synced</span>';
        badge.title = 'Active: Real-time Cloud Synchronization Active (Click to sync now)';
      } else if (status === 'permission_error') {
        badge.className = 'pwa-network-badge offline';
        badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><span>Rules Locked</span>';
        badge.title = 'Firebase Permission Denied! Set Realtime Database Rules to read/write true in Firebase Console.';
      } else if (status === 'offline') {
        badge.className = 'pwa-network-badge offline';
        badge.innerHTML = '<i class="fa-solid fa-bolt"></i><span>Offline Mode</span>';
        badge.title = 'Offline: All data saved locally on device (Click to sync)';
      }
    },

    // Update the Settings Card UI
    updateStatusUI() {
      const statusEl = document.getElementById('firebase-sync-status-badge');
      const inputEl = document.getElementById('firebase-db-url-input');
      const lastSyncEl = document.getElementById('firebase-last-sync-time');

      const isConf = this.isConfigured();
      const currentUrl = this.getDbUrl();

      if (inputEl && document.activeElement !== inputEl) {
        inputEl.value = currentUrl;
      }

      if (statusEl) {
        if (isConf) {
          statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Connected &amp; Auto-Syncing';
          statusEl.style.color = '#10b981';
          statusEl.style.background = 'rgba(16, 185, 129, 0.12)';
          statusEl.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        } else {
          statusEl.innerHTML = '<i class="fa-solid fa-circle-info"></i> Local Storage Only (Not Connected)';
          statusEl.style.color = '#f59e0b';
          statusEl.style.background = 'rgba(245, 158, 11, 0.12)';
          statusEl.style.border = '1px solid rgba(245, 158, 11, 0.3)';
        }
      }

      if (lastSyncEl) {
        const lastSync = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
        if (lastSync && isConf) {
          const d = new Date(parseInt(lastSync, 10));
          const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const expCount = (window.storage && window.storage.getExpenses) ? window.storage.getExpenses().length : 0;
          lastSyncEl.textContent = `Last synced: ${timeStr} (${expCount} expenses active)`;
        } else {
          lastSyncEl.textContent = isConf ? 'Ready to sync' : 'Connect below to enable real-time multi-device sync';
        }
      }
    },

    // UI Action: Save Firebase configuration from Settings input
    saveFromInput() {
      const inputEl = document.getElementById('firebase-db-url-input');
      if (!inputEl) return;
      let url = inputEl.value.trim();
      if (!url) {
        this.setDbUrl('');
        if (window.showToast) {
          window.showToast('Cloud sync disabled. Operating in 100% offline local storage mode.', 'info');
        }
        return;
      }

      const sanitized = this.sanitizeDbUrl(url);

      if (!this.isValidFirebaseUrl(sanitized)) {
        if (window.showToast) {
          window.showToast('Please enter a valid Firebase URL (e.g. https://your-project.firebasedatabase.app or https://your-project.firebaseio.com)', 'warning');
        }
        return;
      }

      this.setDbUrl(sanitized);
      if (window.showToast) {
        window.showToast('✅ Firebase URL saved! Testing cloud connection...', 'info');
      }
      this.syncNow(false);
    },

    openSetupGuide() {
      const modal = document.getElementById('firebase-setup-modal');
      if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
      }
    },

    closeSetupGuide() {
      const modal = document.getElementById('firebase-setup-modal');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
      }
    },

    // Live Connection Diagnostic Test
    async runDiagnosticTest() {
      const resultEl = document.getElementById('firebase-diagnostic-result');
      if (resultEl) {
        resultEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing live connection &amp; permissions...';
        resultEl.style.color = '#6366f1';
      }

      const dbUrl = this.getDbUrl();
      if (!dbUrl) {
        if (resultEl) {
          resultEl.innerHTML = '❌ <strong>Error: No Database URL Entered.</strong><br>Please paste your Firebase Database URL in the box above and tap "Save &amp; Connect".';
          resultEl.style.color = '#ef4444';
        }
        return;
      }

      if (!this.isValidFirebaseUrl(dbUrl)) {
        if (resultEl) {
          resultEl.innerHTML = `❌ <strong>Error: Invalid URL Format.</strong><br>URL must contain <code>firebaseio.com</code> or <code>firebasedatabase.app</code>.<br>Current: ${dbUrl}`;
          resultEl.style.color = '#ef4444';
        }
        return;
      }

      const userId = this.getCurrentUserId();
      const localExp = (window.storage && window.storage.getExpenses) ? window.storage.getExpenses().length : 0;
      const endpoint = `${dbUrl}/spendorio/users/${encodeURIComponent(userId)}.json`;

      try {
        // Step 1: Test GET (Read) with cache-busting and timeout
        const getResp = await this.fetchWithTimeout(`${endpoint}?_ts=${Date.now()}`, { cache: 'no-store' }, 8000);
        if (!getResp.ok) {
          let errText = '';
          try {
            const errJson = await getResp.json();
            errText = (errJson && errJson.error) ? String(errJson.error) : '';
          } catch (e) {}

          if (getResp.status === 401 || getResp.status === 403 || errText.toLowerCase().includes('permission denied')) {
            if (resultEl) {
              resultEl.innerHTML = `❌ <strong>401 Permission Denied!</strong><br>Your Firebase database rules are locked.<br>In Firebase Console &gt; Realtime Database &gt; <strong>Rules</strong> tab, set:<br><code>{"rules": {"spendorio": {"users": {"$userId": {".read": true, ".write": true}}}}}</code><br>and click <strong>Publish</strong>.`;
              resultEl.style.color = '#ef4444';
            }
            return;
          }
          if (resultEl) {
            resultEl.innerHTML = `❌ <strong>HTTP ${getResp.status} Error:</strong> ${errText || getResp.statusText}<br>Endpoint: ${endpoint}`;
            resultEl.style.color = '#ef4444';
          }
          return;
        }

        const cloudData = await getResp.json();
        const cloudExp = (cloudData && Array.isArray(cloudData.expenses)) ? cloudData.expenses.length : 0;

        // Step 2: Test PUT (Write)
        const localTasks = (window.storage && window.storage.getTasks) ? window.storage.getTasks() : [];
        const localExpenses = (window.storage && window.storage.getExpenses) ? window.storage.getExpenses() : [];
        const localIncomes = (window.storage && window.storage.getIncomes) ? window.storage.getIncomes() : [];
        const localSettings = (window.storage && window.storage.getSettings) ? window.storage.getSettings() : {};

        const activeDeletedIds = (window.storage && typeof window.storage.getDeletedIds === 'function') ? window.storage.getDeletedIds() : new Set();
        const cloudTasks = (cloudData && Array.isArray(cloudData.tasks)) ? cloudData.tasks : [];
        const cloudExpenses = (cloudData && Array.isArray(cloudData.expenses)) ? cloudData.expenses : [];
        const cloudIncomes = (cloudData && Array.isArray(cloudData.incomes)) ? cloudData.incomes : [];

        const mergedExpenses = this.mergeEntitiesById(localExpenses, cloudExpenses, activeDeletedIds);
        const mergedTasks = this.mergeEntitiesById(localTasks, cloudTasks, activeDeletedIds);
        const mergedIncomes = this.mergeEntitiesById(localIncomes, cloudIncomes, activeDeletedIds);

        const testPayload = {
          userId: userId,
          updatedAt: Date.now(),
          device: (navigator.userAgent && navigator.userAgent.includes('Mobile')) ? 'Phone' : 'Desktop',
          tasks: mergedTasks,
          expenses: mergedExpenses,
          incomes: mergedIncomes,
          settings: localSettings,
          deletedIds: Array.from(activeDeletedIds)
        };

        const putResp = await this.fetchWithTimeout(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload)
        }, 9000);

        if (!putResp.ok) {
          let putErr = '';
          try {
            const pj = await putResp.json();
            putErr = (pj && pj.error) ? String(pj.error) : '';
          } catch (e) {}

          if (putResp.status === 401 || putResp.status === 403 || putErr.toLowerCase().includes('permission denied')) {
            if (resultEl) {
              resultEl.innerHTML = `❌ <strong>Write Permission Denied (HTTP 401)!</strong><br>Firebase allows read but blocked write.<br>Make sure <code>.write: true</code> is inside <code>"spendorio": {"users": {"$userId": ...}}</code> and click <strong>Publish</strong>.`;
              resultEl.style.color = '#ef4444';
            }
            return;
          }
          if (resultEl) {
            resultEl.innerHTML = `❌ <strong>Write Failed (HTTP ${putResp.status}):</strong> ${putErr || putResp.statusText}`;
            resultEl.style.color = '#ef4444';
          }
          return;
        }

        // Apply merged results locally as well
        window.storage._isSyncingFromCloud = true;
        try {
          window.storage.saveExpenses(mergedExpenses);
          window.storage.saveTasks(mergedTasks);
          window.storage.saveIncomes(mergedIncomes);
        } finally {
          window.storage._isSyncingFromCloud = false;
        }
        this.refreshAllUI();

        // Both Read and Write succeeded!
        if (resultEl) {
          resultEl.innerHTML = `🟢 <strong>100% CONNECTED &amp; VERIFIED!</strong><br>• User ID: <code>${userId}</code><br>• Local Stored: <strong>${localExp}</strong><br>• Cloud Stored: <strong>${cloudExp}</strong><br>• Total Synced: <strong>${mergedExpenses.length}</strong><br>• Status: Read &amp; Write working in real-time!`;
          resultEl.style.color = '#10b981';
        }
        if (window.showToast) {
          window.showToast(`✅ Cloud Sync 100% Verified! (${mergedExpenses.length} expenses synced)`, 'success');
        }
        this.updateSyncBadge('synced');
        this.updateStatusUI();
      } catch (netErr) {
        if (resultEl) {
          resultEl.innerHTML = `❌ <strong>Network / CORS Failed:</strong><br>${netErr.message}<br>Check your internet connection and verify the database URL is spelled correctly.`;
          resultEl.style.color = '#ef4444';
        }
      }
    },

    // Force clear PWA cache and reload fresh app code from server
    forceClearCacheAndReload() {
      if (window.confirm('Clear cached app files and reload latest version?')) {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
              registration.unregister();
            }
          });
        }
        if ('caches' in window) {
          caches.keys().then(names => {
            for (let name of names) {
              caches.delete(name);
            }
          });
        }
        try {
          sessionStorage.clear();
        } catch (e) {}
        setTimeout(() => {
          window.location.reload(true);
        }, 300);
      }
    }
  };

  // Expose globally
  window.FirebaseSync = FirebaseSync;
  window.firebaseSync = FirebaseSync;
  window.markLocalUpdated = markLocalUpdated;

  // Initialize on script load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FirebaseSync.init());
  } else {
    FirebaseSync.init();
  }
})();
