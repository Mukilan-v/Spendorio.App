const fs = require('fs');

// 1. Remove the destructive cache-purging script from index.html
function patchIndexHtml() {
  ['public/index.html', 'docs/index.html'].forEach(filePath => {
    let html = fs.readFileSync(filePath, 'utf8');

    const destructiveSnippet = `    if ('caches' in window) {
      caches.keys().then(function(cacheNames) {
        cacheNames.forEach(function(cacheName) {
          if (cacheName !== 'spendorio-v2.0.1') {
            console.log('[Spendorio] Purging stale cache:', cacheName);
            caches.delete(cacheName);
          }
        });
      });
    }`;

    if (html.includes(destructiveSnippet)) {
      html = html.replace(destructiveSnippet, `    // Cache lifecycle is safely managed by sw.js`);
      console.log(`Removed destructive cache-delete snippet from ${filePath}`);
    } else {
      // Fallback regex in case of slight whitespace differences
      html = html.replace(/if\s*\('caches'\s*in\s*window\)\s*\{\s*caches\.keys\(\)[\s\S]*?cacheName\s*!==\s*'spendorio-v2\.0\.1'[\s\S]*?\}\s*\);\s*\}\s*\}/g, '// Cache lifecycle is safely managed by sw.js');
      console.log(`Regex cleaned cache-delete snippet from ${filePath}`);
    }

    // Bump version tag in index.html
    html = html.replace(/v=20261026_v15_unionsync/g, 'v=20261030_v16_offline_bulletproof');

    fs.writeFileSync(filePath, html, 'utf8');
  });
}

patchIndexHtml();
