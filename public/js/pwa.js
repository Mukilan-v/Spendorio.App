/**
 * Spendorio - Progressive Web App (PWA) Manager (js/pwa.js)
 * Manages Service Worker lifecycle, offline/online transitions, and Desktop/Mobile installation.
 */

(function () {
  'use strict';

  let deferredPrompt = null;
  const DISMISS_KEY = 'spendorio_pwa_banner_dismissed_v2';
  const INSTALLED_KEY = 'spendorio_pwa_installed';

  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };

  const isMobile = () => {
    return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '');
  };

  const isInStandaloneMode = () => {
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true ||
      (typeof document !== 'undefined' && (document.referrer || '').includes('android-app://')) ||
      (window.location.search && window.location.search.includes('mode=standalone'))
    );
  };

  const isInstalled = () => {
    return isInStandaloneMode();
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

        // If running in standalone installed app, never show banner or buttons
        if (isInStandaloneMode()) {
          this.showInstallButtons(false);
          const banner = document.getElementById('pwa-install-banner');
          if (banner) banner.style.display = 'none';
          return;
        }

        // Make install triggers visible
        this.showInstallButtons(true);

        const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
        const banner = document.getElementById('pwa-install-banner');
        if (banner && !dismissed) {
          banner.style.display = 'flex';
        }
      });

      window.addEventListener('appinstalled', () => {
        console.log('[Spendorio PWA] Successfully installed on device!');
        deferredPrompt = null;
        try {
          localStorage.setItem(INSTALLED_KEY, 'true');
          localStorage.setItem(DISMISS_KEY, 'true');
        } catch (e) {}
        this.showInstallButtons(false);
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';

        if (window.showToast) {
          window.showToast('🎉 Spendorio installed! Works 100% offline.', 'success');
        }
      });
    },

    // Download direct Windows Desktop Shortcut (.url file)
    downloadDesktopShortcut() {
      try {
        const content = "[InternetShortcut]\r\nURL=https://mukilan-v.github.io/Spendorio.App/\r\nIconIndex=0\r\nIconFile=https://mukilan-v.github.io/Spendorio.App/icons/spendorio.ico\r\n";
        const blob = new Blob([content], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Spendorio-App.url';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (window.showToast) {
          window.showToast('📥 Spendorio desktop shortcut downloaded! Drag to your Desktop to launch anytime.', 'success');
        }
      } catch (err) {
        console.error('[Spendorio PWA] Error downloading desktop shortcut:', err);
      }
    },

    // Trigger installation flow
    async promptInstall() {
      console.log('[Spendorio PWA] promptInstall called! deferredPrompt available:', !!deferredPrompt, 'isMobile:', isMobile());

      if (isInStandaloneMode()) {
        if (window.showToast) {
          window.showToast('Spendorio is already running in app mode!', 'info');
        }
        return;
      }

      // Desktop installation workflow
      if (!isMobile()) {
        // 1. Immediately trigger the direct desktop launcher shortcut download
        this.downloadDesktopShortcut();

        // 2. If native browser PWA install prompt is ready, trigger it too
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
            console.warn('[Spendorio PWA] Error triggering native prompt:', err);
          }
        }

        // 3. Open desktop confirmation modal with clear instructions
        this.openGenericInstallModal();
        return;
      }

      // Mobile installation workflow
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          if (window.showToast) {
            window.showToast('👆 Tap "Install" on the prompt to add to Home Screen!', 'info');
          }
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
      } else {
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
        if (btn) {
          btn.style.display = show ? (btn.id === 'pwa-header-install-btn' ? 'inline-flex' : 'flex') : 'none';
        }
      });
    },

    checkInstalledState() {
      if (isInStandaloneMode()) {
        console.log('[Spendorio PWA] Running in Standalone Installed Mode!');
        document.body.classList.add('pwa-standalone');
        this.showInstallButtons(false);
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
        return;
      }

      // If running inside standard browser window, make install button accessible
      this.showInstallButtons(true);

      const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
      const banner = document.getElementById('pwa-install-banner');
      if (banner) {
        banner.style.display = dismissed ? 'none' : 'flex';
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
      try {
        localStorage.setItem(DISMISS_KEY, 'true');
      } catch (e) {}
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'none';
    },

    openGenericInstallModal() {
      const modal = document.getElementById('pwa-generic-modal');
      if (!modal) return;

      const titleEl = modal.querySelector('.pwa-modal-title span');
      const bodyEl = modal.querySelector('.pwa-modal-body');

      if (!isMobile()) {
        if (titleEl) titleEl.textContent = 'Spendorio Desktop App';
        if (bodyEl) {
          bodyEl.innerHTML = `
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 12px; margin-bottom: 1rem; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 1.5rem;"></i>
              <div>
                <div style="font-weight: 700; color: #10b981; font-size: 0.9rem;">Desktop Shortcut Downloaded!</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">Check your browser's <strong>Downloads</strong> folder.</div>
              </div>
            </div>

            <div class="pwa-step-item">
              <div class="pwa-step-num">1</div>
              <div class="pwa-step-text">Drag or move <strong>Spendorio-App.url</strong> from Downloads to your <strong>Desktop</strong>.</div>
            </div>
            <div class="pwa-step-item">
              <div class="pwa-step-num">2</div>
              <div class="pwa-step-text">Double-click it anytime on your computer to launch Spendorio instantly!</div>
            </div>
            <div class="pwa-step-item">
              <div class="pwa-step-num">3</div>
              <div class="pwa-step-text"><strong>Standalone Window App:</strong> You can also click the <strong>App (⊕) icon</strong> in your browser's address bar to install as a dedicated window.</div>
            </div>

            <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color); text-align: center;">
              <button type="button" class="btn-insta-gradient" onclick="window.SpendorioPWA.downloadDesktopShortcut()" style="width: 100%; padding: 0.65rem 1rem; font-size: 0.85rem; font-weight: 700; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fa-solid fa-download"></i>
                <span>Download Desktop Shortcut (.url) Again</span>
              </button>
            </div>
          `;
        }
      } else {
        if (titleEl) titleEl.textContent = 'Install Spendorio App';
        if (bodyEl) {
          bodyEl.innerHTML = `
            <p style="margin: 0 0 1rem; font-size: 0.85rem; color: var(--text-muted);">Install Spendorio on your phone for full offline access:</p>
            <div class="pwa-step-item">
              <div class="pwa-step-num">1</div>
              <div class="pwa-step-text">Tap the browser <strong>Three Dots (⋮)</strong> menu in Chrome.</div>
            </div>
            <div class="pwa-step-item">
              <div class="pwa-step-num">2</div>
              <div class="pwa-step-text">Select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.</div>
            </div>
            <div class="pwa-step-item">
              <div class="pwa-step-num">3</div>
              <div class="pwa-step-text">Launch Spendorio directly from your home screen like any native app!</div>
            </div>
          `;
        }
      }

      modal.style.display = 'flex';
    },

    closeGenericInstallModal() {
      const modal = document.getElementById('pwa-generic-modal');
      if (modal) modal.style.display = 'none';
      try {
        localStorage.setItem(DISMISS_KEY, 'true');
      } catch (e) {}
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'none';
    }
  };

  // Expose globally under all casings to prevent any undefined reference errors
  window.SpendorioPWA = SpendorioPWA;
  window.spendorioPWA = SpendorioPWA;
  window.spendoraPWA = SpendorioPWA;

  SpendorioPWA.init();
})();
