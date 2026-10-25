const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const dataFile = path.join(__dirname, '..', 'data', 'backup.json');
const desktopDir = path.join(process.env.USERPROFILE || 'C:\\Users\\acer', 'Desktop');
const outputPdf = path.join(desktopDir, 'Spendorio_Expense_Statement.pdf');
const tempHtml = path.join(__dirname, 'temp_statement.html');

let expenses = [];
let total = 0;

if (fs.existsSync(dataFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    expenses = data.expenses || [];
  } catch(e) {}
}

total = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

// Sort expenses latest first
expenses.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));

let rows = '';
expenses.slice(0, 100).forEach((e, idx) => {
  rows += `
    <tr>
      <td style="text-align: center; color: #64748b;">${idx + 1}</td>
      <td><strong>${e.date || ''}</strong></td>
      <td>${e.title || e.description || 'Expense'}</td>
      <td><span style="background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${e.category || 'General'}</span></td>
      <td>${e.paymentMethod || 'UPI / Cash'}</td>
      <td style="text-align: right; font-weight: 700; color: #dc2626;">₹${parseFloat(e.amount || 0).toLocaleString('en-IN')}</td>
    </tr>
  `;
});

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Spendorio - Official Expense Statement</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', -apple-system, sans-serif; color: #1e293b; line-height: 1.5; font-size: 12px; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 2px; }
    .stat-box { display: flex; gap: 14px; margin-bottom: 18px; }
    .stat-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
    .stat-val { font-size: 18px; font-weight: 800; color: #0f172a; }
    .stat-lbl { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11.5px; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">SPENDORIO</h1>
      <div class="subtitle">Official Account Statement & Cost Audit Report</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #475569;">
      Account Holder: <strong>Mukilan Viswa</strong><br>
      Date: ${new Date().toLocaleDateString('en-GB')}<br>
      Currency: INR (₹)
    </div>
  </div>

  <div class="stat-box">
    <div class="stat-card">
      <div class="stat-lbl">Total Expenses Logged</div>
      <div class="stat-val" style="color: #dc2626;">₹${total.toLocaleString('en-IN')}</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Total Transactions</div>
      <div class="stat-val">${expenses.length} Records</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">System Architecture</div>
      <div class="stat-val" style="font-size: 14px; color: #2563eb;">Spring Boot & PWA</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">#</th>
        <th style="width: 15%;">Date</th>
        <th style="width: 35%;">Description / Item</th>
        <th style="width: 20%;">Category</th>
        <th style="width: 12%;">Method</th>
        <th style="width: 13%; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    Generated automatically by Spendorio Core Engine &copy; 2026. Data verified with Golden Safeguard.
  </div>
</body>
</html>`;

fs.writeFileSync(tempHtml, htmlContent, 'utf8');

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  '--print-to-pdf=' + outputPdf,
  tempHtml
];

cp.execFile(chrome, args, (err) => {
  try { fs.unlinkSync(tempHtml); } catch(e){}
  if (err) {
    console.error('Error generating statement PDF:', err);
    return;
  }
  if (fs.existsSync(outputPdf)) {
    console.log('PDF GENERATED SUCCESSFULLY!');
    console.log('Location:', outputPdf);
    console.log('Size:', (fs.statSync(outputPdf).size / 1024).toFixed(2), 'KB');
  }
});
