const fs = require('fs');

['public/index.html', 'docs/index.html'].forEach(filePath => {
  let html = fs.readFileSync(filePath, 'utf8');

  const card6Html = `
            <!-- Card 6: Family Support & Pocket Money -->
            <div class="stat-card stat-card-interactive" style="border-left: 4px solid #8b5cf6;" onclick="window.app.openStatDetails('pocket_money')" title="Click to view Family Support &amp; Pocket Money Details &amp; Shortcut">
              <div class="stat-info">
                <span class="stat-label">Family Support &amp; Pocket Money <i class="fa-solid fa-arrow-up-right-from-square stat-shortcut-icon"></i></span>
                <span class="stat-value" id="stat-pocket-money" style="color: #8b5cf6;">₹0</span>
                <span class="stat-sub" id="stat-pocket-money-sub">0 family &amp; pocket entries</span>
              </div>
              <div class="stat-icon-wrap" style="background: rgba(139, 92, 246, 0.12); color: #8b5cf6;" title="Click to view pocket money details">
                <i class="fa-solid fa-hand-holding-heart"></i>
              </div>
            </div>`;

  // Locate by closing tag of the tasks stat-card
  const searchPattern = /<div class="stat-card card-tasks stat-card-interactive"[\s\S]*?id="stat-tasks-completed"[\s\S]*?<\/div>\s*<\/div>/;
  const match = html.match(searchPattern);
  console.log(filePath, 'found match?', !!match);

  if (match && !html.includes('id="stat-pocket-money"')) {
    html = html.replace(match[0], match[0] + '\n' + card6Html);
    console.log('Successfully inserted Card 6 into', filePath);
  }

  // Bump version to v19
  html = html.replace(/v18_pocket_money/g, 'v19_card6_active');

  fs.writeFileSync(filePath, html, 'utf8');
});

// Also bump sw.js cache name to spendorio-v2.1.3
['public/sw.js', 'docs/sw.js'].forEach(filePath => {
  let sw = fs.readFileSync(filePath, 'utf8');
  sw = sw.replace('spendorio-v2.1.2', 'spendorio-v2.1.3');
  fs.writeFileSync(filePath, sw, 'utf8');
  console.log('Bumped SW in', filePath);
});
