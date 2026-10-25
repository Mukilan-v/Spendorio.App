/**
 * Spendorio - Progressive Web App (PWA) Manager (js/pwa.js)
 * Manages Service Worker lifecycle, offline/online transitions, and Home Screen installation.
 */

(function () {
  'use strict';

  let deferredPrompt = null;
  const DISMISS_KEY = 'spendorio_pwa_banner_dismissed_v2';

  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };

  const isInStandaloneMode = () => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  };

  const SpendorioPWA = {
    init() {
      this.registerServiceWorker();
      this.setupInstallPrompt();
      this.setupNetworkMonitoring();
      this.checkInstalledState();
    },

    // 1. Service Worker Registration
    registerServiceWorker() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[Spendorio PWA] Service worker controller updated successfully.');
        });

        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('./sw.js')
            .then((reg) => {
              console.log('[Spendorio PWA] Service Worker registered successfully! Scope:', reg.scope);

              // Automatically trigger an update check on page load
              if (reg.update) {
                reg.update();
              }

              // Check for updates
              reg.onupdatefound = () => {
                const installingWorker = reg.installing;
                if (!installingWorker) return;
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      console.log('[Spendorio PWA] New update ready. Refresh when convenient.');
                      if (window.showToast) {
                        window.showToast('🚀 App updated! Works faster & offline.', 'info');
                      }
                    } else {
                      console.log('[Spendorio PWA] Offline caching complete! Ready for offline use.');
                    }
                  }
                };
              };
            })
            .catch((err) => {
              console.warn('[Spendorio PWA] Service Worker registration failed:', err);
            });
        });
      }
    },

    // 2. Install Prompt Listener
    setupInstallPrompt() {
      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent default mini-infobar on mobile Chrome
        e.preventDefault();
        deferredPrompt = e;
        console.log('[Spendorio PWA] Native beforeinstallprompt captured!');

        // Make install triggers highly visible
        this.showInstallButtons(true);

        const banner = document.getElementById('pwa-install-banner');
        if (banner && !isInStandaloneMode()) {
          banner.style.display = 'flex';
        }
      });

      window.addEventListener('appinstalled', () => {
        console.log('[Spendorio PWA] Successfully installed on device!');
        deferredPrompt = null;
        this.showInstallButtons(false);
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';

        if (window.showToast) {
          window.showToast('🎉 Spendorio added to Home Screen! You can now use it 100% offline.', 'success');
        }
      });
    },

    // Trigger installation flow
    async promptInstall() {
      console.log('[Spendorio PWA] promptInstall called! deferredPrompt available:', !!deferredPrompt);

      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          console.log('[Spendorio PWA] User install choice:', choice.outcome);
          if (choice.outcome === 'accepted') {
            deferredPrompt = null;
            this.showInstallButtons(false);
            const banner = document.getElementById('pwa-install-banner');
            if (banner) banner.style.display = 'none';
          }
        } catch (err) {
          console.warn('[Spendorio PWA] Error triggering prompt:', err);
          this.openGenericInstallModal();
        }
      } else if (isIos() && !isInStandaloneMode()) {
        this.openIosInstallModal();
      } else if (isInStandaloneMode()) {
        if (window.showToast) {
          window.showToast('Spendorio is already installed as an app on your phone!', 'info');
        }
      } else {
        // Direct browser menu fallback for Chrome / Edge
        this.openGenericInstallModal();
      }
    },

    dismissBanner() {
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'none';
      try {
        localStorage.setItem(DISMISS_KEY, 'true');
      } catch (e) {}
    },

    showInstallButtons(show) {
      const btns = document.querySelectorAll('.pwa-install-trigger');
      btns.forEach((btn) => {
        btn.style.display = show ? 'inline-flex' : 'none';
      });
    },

    checkInstalledState() {
      if (isInStandaloneMode()) {
        console.log('[Spendorio PWA] Running in Standalone Installed Mode!');
        document.body.classList.add('pwa-standalone');
        this.showInstallButtons(false);
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
      } else {
        // ALWAYS make install buttons active & visible on mobile / desktop
        this.showInstallButtons(true);
        const banner = document.getElementById('pwa-install-banner');
        if (banner) {
          banner.style.display = 'flex';
        }
      }
    },

    // 3. Online/Offline Network Monitoring
    setupNetworkMonitoring() {
      const updateNetworkStatus = (isOnline) => {
        const badge = document.getElementById('pwa-network-badge');
        if (badge) {
          if (isOnline) {
            badge.className = 'pwa-network-badge online';
            badge.innerHTML = '<i class="fa-solid fa-circle-check"></i><span>Synced</span>';
            badge.title = 'Online: Cloud synchronization active';
          } else {
            badge.className = 'pwa-network-badge offline';
            badge.innerHTML = '<i class="fa-solid fa-bolt"></i><span>Offline Mode</span>';
            badge.title = 'Offline: All data saved locally on your phone';
          }
        }
      };

      window.addEventListener('online', () => {
        updateNetworkStatus(true);
        if (window.showToast) {
          window.showToast('🟢 Back Online! Syncing changes with cloud...', 'success');
        }
        if (window.storage && typeof window.storage.syncWithServer === 'function') {
          window.storage.syncWithServer();
        }
      });

      window.addEventListener('offline', () => {
        updateNetworkStatus(false);
        if (window.showToast) {
          window.showToast('⚡ Offline Mode Active! Data is 100% saved on your phone.', 'info');
        }
      });

      // Initial check
      updateNetworkStatus(navigator.onLine);
    },

    openIosInstallModal() {
      const modal = document.getElementById('pwa-ios-modal');
      if (modal) modal.style.display = 'flex';
    },

    closeIosInstallModal() {
      const modal = document.getElementById('pwa-ios-modal');
      if (modal) modal.style.display = 'none';
    },

    openGenericInstallModal() {
      const modal = document.getElementById('pwa-generic-modal');
      if (modal) modal.style.display = 'flex';
    },

    closeGenericInstallModal() {
      const modal = document.getElementById('pwa-generic-modal');
      if (modal) modal.style.display = 'none';
    }
  };

  // Expose globally under all casings to prevent any undefined reference errors
  window.SpendorioPWA = SpendorioPWA;
  window.spendorioPWA = SpendorioPWA;
  window.spendoraPWA = SpendorioPWA;

  SpendorioPWA.init();
})();
