const fs = require('fs');
const path = require('path');
const os = require('os');

const desktopDir = path.join(os.homedir(), 'Desktop');
const logFile = path.join(__dirname, '..', 'tunnel.log');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function updatePhoneLink() {
  const localIp = getLocalIp();
  const wifiUrl = `http://${localIp}:3000`;

  for (let i = 0; i < 30; i++) {
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf8');
      const matches = [...content.matchAll(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g)];
      if (matches.length > 0) {
        const url = matches[matches.length - 1][0];
        console.log('[Phone Link] Found active Cloudflare URL:', url);
        console.log('[Phone Link] Wi-Fi URL:', wifiUrl);

        // 1. Clean, clear instructions on Desktop
        const txt = `============================================================\n` +
          `       SPENDORIO & SPENDTRACKER - MOBILE APP & PWA\n` +
          `============================================================\n\n` +
          `👉 PHONE 4G / 5G LINK (OPEN IN CHROME/SAFARI ON PHONE):\n` +
          `   ${url}\n\n` +
          `👉 SCAN QR CODE:\n` +
          `   Double-click "Scan_Phone_QR.png" on your Desktop and scan with your phone camera!\n\n` +
          `👉 WI-FI / LOCAL NETWORK LINK:\n` +
          `   ${wifiUrl}\n\n` +
          `============================================================\n` +
          `📲 HOW TO INSTALL SPENDORIO APP ON YOUR PHONE (100% OFFLINE):\n` +
          `============================================================\n` +
          `1. Open the link above on your phone (Google Chrome or Safari).\n` +
          `2. A banner will appear: "Install Spendorio App". Tap "Install"!\n` +
          `   (OR tap the 3 dots ⋮ in Chrome -> "Install app" / "Add to Home screen")\n` +
          `   (On iPhone: Tap Share ⎋ -> "Add to Home Screen" ⊞)\n` +
          `3. The official "Spendorio" app icon is added to your Phone Home Screen!\n` +
          `4. Tap the icon anytime to open Spendorio like a real native mobile app!\n\n` +
          `============================================================\n` +
          `⚡ 100% OFFLINE CAPABILITY:\n` +
          `============================================================\n` +
          `- Spendorio now works 100% OFFLINE!\n` +
          `- Even if your laptop is powered off or you are in Airplane mode / have NO internet:\n` +
          `  - You can open the app instantly (<0.05s) from your phone screen.\n` +
          `  - Check off daily routines and tasks.\n` +
          `  - Add expenses and track your budget.\n` +
          `  - View analytics and charts.\n` +
          `- Whenever your phone reconnects, Spendorio automatically syncs all changes!\n\n` +
          `============================================================\n` +
          `DOES THIS RUN AS A STANDALONE APP?\n` +
          `============================================================\n` +
          `YES! Spendorio has zero external dependencies. It is a full standalone\n` +
          `offline-capable mobile application.\n` +
          `============================================================\n`;

        fs.writeFileSync(path.join(desktopDir, 'Phone_Link.txt'), txt, 'utf8');

        // 2. Internet Shortcut on Desktop
        const urlShortcut = `[InternetShortcut]\nURL=${url}\nIconIndex=0\nIconFile=${path.join(__dirname, '..', 'public', 'icons', 'spendora_mobile.ico')}\n`;
        fs.writeFileSync(path.join(desktopDir, 'Spendorio Mobile Link.url'), urlShortcut, 'utf8');

        // 3. Download QR Code image
        try {
          const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=15&data=${encodeURIComponent(url)}`;
          const resp = await fetch(qrApi);
          if (resp.ok) {
            const buffer = Buffer.from(await resp.arrayBuffer());
            fs.writeFileSync(path.join(desktopDir, 'Scan_Phone_QR.png'), buffer);
            console.log('[Phone Link] QR Code saved to Desktop');
          }
        } catch (e) {
          console.warn('[Phone Link] Could not download QR:', e.message);
        }

        return;
      }
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

updatePhoneLink();
