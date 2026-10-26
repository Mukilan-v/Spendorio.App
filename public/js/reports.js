/**
 * reports.js - Multi-format Expense Export & Report Generator
 * Supports: PDF Statement, Excel (.xls/.csv), Word (.doc), and Plain Text (.txt)
 */

class ReportManager {
  constructor() {
    this.currency = '₹';
  }

  getFilteredExpenses(period = 'all') {
    let expenses = window.storage.getExpenses();
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    if (period === 'today') {
      expenses = expenses.filter(e => e.date === today);
    } else if (period === 'month') {
      expenses = expenses.filter(e => e.date && e.date.startsWith(currentMonth));
    }

    return expenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  getFilteredIncomes(period = 'all') {
    let incomes = window.storage.getIncomes();
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    if (period === 'today') {
      incomes = incomes.filter(i => i.date === today);
    } else if (period === 'month') {
      incomes = incomes.filter(i => i.date && i.date.startsWith(currentMonth));
    }

    return incomes.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  getPersonName(exp) {
    if (window.expenses && typeof window.expenses.extractPersons === 'function') {
      const detected = window.expenses.extractPersons(exp.notes, exp.title);
      if (detected && detected.length > 0) {
        return detected.map(p => p.name).join(', ');
      }
    }
    return '-';
  }

  getPersonBreakdown(expenses) {
    const map = {};
    expenses.forEach(e => {
      const personStr = this.getPersonName(e);
      const persons = personStr === '-' ? ['General / Self'] : personStr.split(', ');
      const amount = parseFloat(e.amount) || 0;
      persons.forEach(p => {
        if (!map[p]) map[p] = { name: p, total: 0, count: 0 };
        map[p].total += amount;
        map[p].count += 1;
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }

  getCategoryBreakdown(expenses) {
    const map = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      const amount = parseFloat(e.amount) || 0;
      if (!map[cat]) map[cat] = { category: cat, total: 0, count: 0 };
      map[cat].total += amount;
      map[cat].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }

  getPeriodLabel(period) {
    const today = new Date().toISOString().split('T')[0];
    if (period === 'today') return `Today (${today})`;
    if (period === 'month') return `This Month (${today.substring(0, 7)})`;
    return 'All-Time Total';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PDF / Printable Statement Generator
  // ──────────────────────────────────────────────────────────────────────────
  downloadPDF(period = 'all') {
    const currency = window.storage.getCurrencySymbol() || '₹';
    const expenses = this.getFilteredExpenses(period);
    const incomes = this.getFilteredIncomes(period);
    const totalSpent = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totalIncome = incomes.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const netBalance = totalIncome - totalSpent;
    const persons = this.getPersonBreakdown(expenses);
    const categories = this.getCategoryBreakdown(expenses);
    const periodLabel = this.getPeriodLabel(period);
    const nowStr = new Date().toLocaleString();

    const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Expense Statement - ${periodLabel}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; background: #fff; line-height: 1.45; padding: 20px; font-size: 13px; }
    .no-print { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px 18px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .btn { background: #4f46e5; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 13px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn-secondary { background: #64748b; }
    .header { border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 2px; }
    .meta { font-size: 11px; color: #64748b; text-align: right; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .kpi-value { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .kpi-sub { font-size: 11px; color: #94a3b8; }
    .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px; border-left: 4px solid #4f46e5; padding-left: 8px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 7px 10px; border-bottom: 2px solid #cbd5e1; }
    td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #fafafa; }
    .text-right { text-align: right; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 99px; font-size: 11px; font-weight: 600; background: #ede9fe; color: #6d28d9; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <strong>Print or Save as PDF</strong> — Choose "Save as PDF" in your print destination.
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <button class="btn btn-secondary" onclick="window.close()">Close</button>
    </div>
  </div>

  <div class="header">
    <div>
      <div class="title">Spendorio &amp; SpendTracker</div>
      <div class="subtitle">Official Expense Statement • ${periodLabel}</div>
    </div>
    <div class="meta">
      <div>Generated: ${nowStr}</div>
      <div>Currency: ${currency} (INR)</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Spent</div>
      <div class="kpi-value" style="color: #ef4444;">${currency}${totalSpent.toLocaleString()}</div>
      <div class="kpi-sub">${expenses.length} expense entries</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Incomes</div>
      <div class="kpi-value" style="color: #10b981;">${currency}${totalIncome.toLocaleString()}</div>
      <div class="kpi-sub">${incomes.length} income entries</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Net Balance</div>
      <div class="kpi-value" style="color: ${netBalance >= 0 ? '#10b981' : '#ef4444'};">
        ${netBalance >= 0 ? '+' : ''}${currency}${netBalance.toLocaleString()}
      </div>
      <div class="kpi-sub">Income minus Expenses</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Individuals Tracked</div>
      <div class="kpi-value" style="color: #8b5cf6;">${persons.length}</div>
      <div class="kpi-sub">Amma, Appa, etc.</div>
    </div>
  </div>

  <div class="two-col">
    <div>
      <div class="section-title">Individual / Beneficiary Breakdown</div>
      <table>
        <thead>
          <tr>
            <th>Individual</th>
            <th class="text-right">Count</th>
            <th class="text-right">Total Spent</th>
            <th class="text-right">Share</th>
          </tr>
        </thead>
        <tbody>
          ${persons.map(p => {
            const pct = totalSpent > 0 ? Math.round((p.total / totalSpent) * 100) : 0;
            return `<tr>
              <td><strong>${p.name}</strong></td>
              <td class="text-right">${p.count}</td>
              <td class="text-right"><strong>${currency}${p.total.toLocaleString()}</strong></td>
              <td class="text-right">${pct}%</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div>
      <div class="section-title">Category Spending Breakdown</div>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th class="text-right">Count</th>
            <th class="text-right">Total Spent</th>
            <th class="text-right">Share</th>
          </tr>
        </thead>
        <tbody>
          ${categories.map(c => {
            const pct = totalSpent > 0 ? Math.round((c.total / totalSpent) * 100) : 0;
            return `<tr>
              <td>${c.category}</td>
              <td class="text-right">${c.count}</td>
              <td class="text-right"><strong>${currency}${c.total.toLocaleString()}</strong></td>
              <td class="text-right">${pct}%</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="section-title">Itemized Expense Ledger (${expenses.length} Records)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 32px;">#</th>
        <th style="width: 85px;">Date</th>
        <th>Expense Title</th>
        <th>Category</th>
        <th>Beneficiary / Tag</th>
        <th>Payment</th>
        <th class="text-right">Amount</th>
        <th>Notes & Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${expenses.map((e, i) => {
        const person = this.getPersonName(e);
        return `<tr>
          <td>${i + 1}</td>
          <td>${e.date || 'N/A'}</td>
          <td><strong>${this.escapeHtml(e.title)}</strong></td>
          <td>${this.escapeHtml(e.category || 'Other')}</td>
          <td>${person !== '-' ? `<span class="badge">${this.escapeHtml(person)}</span>` : '-'}</td>
          <td>${this.escapeHtml(e.paymentMethod || 'UPI')}</td>
          <td class="text-right" style="font-weight: 700; color: #dc2626;">${currency}${parseFloat(e.amount).toLocaleString()}</td>
          <td style="color: #64748b; font-size: 11px;">${this.escapeHtml(e.notes || '')}</td>
        </tr>`;
      }).join('')}
      <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #cbd5e1;">
        <td colspan="6" style="padding: 10px; font-size: 13px;">GRAND TOTAL EXPENSES</td>
        <td class="text-right" style="font-size: 14px; color: #dc2626; padding: 10px;">${currency}${totalSpent.toLocaleString()}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Generated automatically by Spendorio &amp; SpendTracker • Private & Confidential
  </div>

  <script>
    // Auto-trigger print dialog after render
    window.addEventListener('load', () => {
      setTimeout(() => { window.print(); }, 400);
    });
  </script>
</body>
</html>`;

    // DIRECT PDF DOWNLOAD ENGINE
    if (typeof html2pdf !== 'undefined') {
      try {
        const container = document.createElement('div');
        container.style.padding = '20px';
        container.style.background = '#ffffff';
        container.style.color = '#0f172a';
        container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        container.innerHTML = printHtml;
        const noPrint = container.querySelectorAll('.no-print, script');
        noPrint.forEach(el => {
          if (typeof el.remove === 'function') el.remove();
          else if (el.parentNode) el.parentNode.removeChild(el);
        });

        if (window.app && window.app.showToast) {
          window.app.showToast('Generating direct PDF download...', 'info');
        }

        const opt = {
          margin: 10,
          filename: `Spendorio_Statement_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(container).save().then(() => {
          if (window.app && window.app.showToast) {
            window.app.showToast('PDF downloaded directly to your device!', 'success');
          }
        }).catch(err => {
          console.warn('html2pdf fallback to print preview:', err);
          this._fallbackPrintWindow(printHtml, period, nowStr);
        });
        return;
      } catch (err) {
        console.warn('Direct PDF error, falling back:', err);
      }
    }

    this._fallbackPrintWindow(printHtml, period, nowStr);
  }

  _fallbackPrintWindow(printHtml, period, nowStr) {
    // Open in a new tab/window which triggers print-to-PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      if (window.app && window.app.showToast) {
        window.app.showToast('PDF print preview opened! Choose "Save as PDF" to download.', 'success');
      }
    } else {
      // If popup blocker blocked it, offer as downloadable HTML statement file
      const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' });
      this.triggerBlobDownload(blob, `expense-statement-${period}-${nowStr.replace(/[^a-zA-Z0-9]/g, '_')}.html`);
      if (window.app && window.app.showToast) {
        window.app.showToast('Popup was blocked: Statement downloaded as HTML! Open and print to PDF.', 'info');
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Excel Spreadsheet (.xls with styling and formulas)
  // ──────────────────────────────────────────────────────────────────────────
  downloadExcel(period = 'all') {
    const currency = window.storage.getCurrencySymbol() || '₹';
    const expenses = this.getFilteredExpenses(period);
    const totalSpent = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const persons = this.getPersonBreakdown(expenses);
    const categories = this.getCategoryBreakdown(expenses);
    const periodLabel = this.getPeriodLabel(period);
    const today = new Date().toISOString().split('T')[0];

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Expenses Ledger</x:Name>
          <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    th { background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #312e81; padding: 8px; }
    td { border: 1px solid #cbd5e1; padding: 6px; }
    .header-title { font-size: 16pt; font-weight: bold; color: #1e1b4b; }
    .kpi-hdr { background-color: #f1f5f9; font-weight: bold; }
    .total-row { background-color: #fee2e2; font-weight: bold; color: #991b1b; }
    .currency-cell { mso-number-format: "\\#\\,\\#\\#0\\.00"; text-align: right; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="8" class="header-title">Spendorio &amp; SpendTracker - Expense Statement</td></tr>
    <tr><td colspan="8" style="color:#64748b;">Period: ${periodLabel} | Export Date: ${today} | Currency: ${currency}</td></tr>
    <tr></tr>

    <!-- SUMMARY SECTION -->
    <tr><th colspan="4" style="background-color:#0284c7;">Individual / Beneficiary Summary</th><th colspan="4" style="background-color:#0d9488;">Category Summary</th></tr>
    <tr>
      <td class="kpi-hdr">Person</td><td class="kpi-hdr">Count</td><td class="kpi-hdr" colspan="2">Total Amount (${currency})</td>
      <td class="kpi-hdr">Category</td><td class="kpi-hdr">Count</td><td class="kpi-hdr" colspan="2">Total Amount (${currency})</td>
    </tr>`;

    const maxRows = Math.max(persons.length, categories.length);
    for (let i = 0; i < maxRows; i++) {
      const p = persons[i] || { name: '', count: '', total: '' };
      const c = categories[i] || { category: '', count: '', total: '' };
      html += `<tr>
        <td>${this.escapeHtml(p.name)}</td><td>${p.count}</td><td colspan="2" class="currency-cell">${p.total}</td>
        <td>${this.escapeHtml(c.category)}</td><td>${c.count}</td><td colspan="2" class="currency-cell">${c.total}</td>
      </tr>`;
    }

    html += `
    <tr></tr>
    <tr></tr>

    <!-- DETAILED EXPENSE LEDGER -->
    <tr><th colspan="8" style="background-color:#4338ca; font-size:12pt;">Complete Itemized Expense Records (${expenses.length} Records)</th></tr>
    <tr>
      <th>#</th>
      <th>Date</th>
      <th>Expense Title</th>
      <th>Category</th>
      <th>Beneficiary / Tag</th>
      <th>Payment Method</th>
      <th>Amount (${currency})</th>
      <th>Notes & Remarks</th>
    </tr>`;

    expenses.forEach((e, i) => {
      const person = this.getPersonName(e);
      html += `<tr>
        <td>${i + 1}</td>
        <td>${e.date || ''}</td>
        <td>${this.escapeHtml(e.title || '')}</td>
        <td>${this.escapeHtml(e.category || '')}</td>
        <td>${this.escapeHtml(person)}</td>
        <td>${this.escapeHtml(e.paymentMethod || 'UPI')}</td>
        <td class="currency-cell">${parseFloat(e.amount) || 0}</td>
        <td>${this.escapeHtml(e.notes || '')}</td>
      </tr>`;
    });

    const startRow = 8 + maxRows + 4;
    const endRow = startRow + expenses.length - 1;
    html += `
    <tr class="total-row">
      <td colspan="6" style="text-align:right; font-weight:bold; font-size:11pt;">GRAND TOTAL:</td>
      <td class="currency-cell" style="font-weight:bold; font-size:11pt;">=SUM(G${startRow}:G${endRow})</td>
      <td>Pure Sum Total</td>
    </tr>
  </table>
</body>
</html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    this.triggerBlobDownload(blob, `expense-statement-${today}.xls`);

    if (window.app && window.app.showToast) {
      window.app.showToast('Excel spreadsheet (.xls) downloaded successfully!', 'success');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Word Document (.doc format)
  // ──────────────────────────────────────────────────────────────────────────
  downloadWord(period = 'all') {
    const currency = window.storage.getCurrencySymbol() || '₹';
    const expenses = this.getFilteredExpenses(period);
    const totalSpent = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const persons = this.getPersonBreakdown(expenses);
    const periodLabel = this.getPeriodLabel(period);
    const today = new Date().toISOString().split('T')[0];

    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Expense Statement - ${periodLabel}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #333333; margin: 20mm; }
    h1 { color: #1e1b4b; font-size: 18pt; margin-bottom: 2pt; }
    p.meta { color: #64748b; font-size: 9pt; margin-bottom: 15pt; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15pt; }
    th { background-color: #4f46e5; color: #ffffff; font-weight: bold; text-align: left; padding: 6pt; border: 1pt solid #4338ca; font-size: 10pt; }
    td { padding: 5pt 6pt; border: 1pt solid #cbd5e1; font-size: 9.5pt; vertical-align: middle; }
    .kpi-box { background-color: #f8fafc; border: 1pt solid #cbd5e1; padding: 8pt; margin-bottom: 15pt; }
    .text-right { text-align: right; }
  </style>
</head>
<body>
  <h1>Spendorio &amp; SpendTracker</h1>
  <p class="meta">Official Expense Statement • ${periodLabel} • Date: ${today}</p>

  <div class="kpi-box">
    <strong>Total Expenses:</strong> ${currency}${totalSpent.toLocaleString()} &nbsp;&nbsp;|&nbsp;&nbsp;
    <strong>Total Records:</strong> ${expenses.length} &nbsp;&nbsp;|&nbsp;&nbsp;
    <strong>Individuals Tracked:</strong> ${persons.length}
  </div>

  <h2 style="font-size:13pt; color:#4338ca; margin-top:12pt; margin-bottom:6pt;">Individual / Beneficiary Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Beneficiary / Individual</th>
        <th class="text-right">Expense Count</th>
        <th class="text-right">Total Amount (${currency})</th>
        <th class="text-right">Percentage</th>
      </tr>
    </thead>
    <tbody>
      ${persons.map(p => `<tr>
        <td><strong>${p.name}</strong></td>
        <td class="text-right">${p.count}</td>
        <td class="text-right">${currency}${p.total.toLocaleString()}</td>
        <td class="text-right">${totalSpent > 0 ? Math.round((p.total / totalSpent) * 100) : 0}%</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <h2 style="font-size:13pt; color:#4338ca; margin-top:15pt; margin-bottom:6pt;">Detailed Expense Ledger</h2>
  <table>
    <thead>
      <tr>
        <th style="width:25pt;">#</th>
        <th style="width:65pt;">Date</th>
        <th>Expense Title</th>
        <th>Category</th>
        <th>Beneficiary</th>
        <th class="text-right">Amount (${currency})</th>
        <th>Notes & Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${expenses.map((e, i) => `<tr>
        <td>${i + 1}</td>
        <td>${e.date || ''}</td>
        <td><strong>${this.escapeHtml(e.title || '')}</strong></td>
        <td>${this.escapeHtml(e.category || '')}</td>
        <td>${this.escapeHtml(this.getPersonName(e))}</td>
        <td class="text-right" style="font-weight:bold; color:#dc2626;">${currency}${parseFloat(e.amount).toLocaleString()}</td>
        <td style="font-size:8.5pt; color:#64748b;">${this.escapeHtml(e.notes || '')}</td>
      </tr>`).join('')}
      <tr style="background-color:#fee2e2; font-weight:bold;">
        <td colspan="5" class="text-right" style="font-size:11pt;">GRAND TOTAL:</td>
        <td class="text-right" style="font-size:11pt; color:#dc2626;">${currency}${totalSpent.toLocaleString()}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <p style="text-align:center; font-size:8pt; color:#94a3b8; margin-top:20pt;">
    Generated by Spendorio &amp; SpendTracker
  </p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    this.triggerBlobDownload(blob, `expense-statement-${today}.doc`);

    if (window.app && window.app.showToast) {
      window.app.showToast('Word Document (.doc) downloaded successfully!', 'success');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Enhanced CSV Data Export
  // ──────────────────────────────────────────────────────────────────────────
  downloadCSV(period = 'all') {
    const expenses = this.getFilteredExpenses(period);
    const today = new Date().toISOString().split('T')[0];
    const headers = ['#', 'ID', 'Date', 'Title', 'Category', 'Beneficiary', 'Amount', 'Payment Method', 'Notes'];

    const rows = expenses.map((e, i) => [
      i + 1,
      `"${e.id}"`,
      `"${e.date}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${e.category || ''}"`,
      `"${(this.getPersonName(e) || '').replace(/"/g, '""')}"`,
      e.amount,
      `"${e.paymentMethod || 'UPI'}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    // Prepend UTF-8 BOM so Excel opens Rupee symbols and UTF-8 characters properly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    this.triggerBlobDownload(blob, `expenses-export-${today}.csv`);

    if (window.app && window.app.showToast) {
      window.app.showToast('Expenses CSV exported successfully!', 'success');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Plain Text Summary (.txt)
  // ──────────────────────────────────────────────────────────────────────────
  downloadText(period = 'all') {
    const currency = window.storage.getCurrencySymbol() || '₹';
    const expenses = this.getFilteredExpenses(period);
    const totalSpent = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const persons = this.getPersonBreakdown(expenses);
    const periodLabel = this.getPeriodLabel(period);
    const today = new Date().toISOString().split('T')[0];

    let text = `========================================================\n`;
    text += ` Spendorio & SPENDTRACKER - EXPENSE STATEMENT\n`;
    text += `========================================================\n`;
    text += `Period:       ${periodLabel}\n`;
    text += `Date:         ${today}\n`;
    text += `Total Spent:  ${currency}${totalSpent.toLocaleString()}\n`;
    text += `Records:      ${expenses.length}\n`;
    text += `========================================================\n\n`;

    text += `--- INDIVIDUAL BENEFICIARY BREAKDOWN ---\n`;
    persons.forEach(p => {
      text += `• ${p.name.padEnd(16)} : ${currency}${p.total.toLocaleString().padStart(8)} (${p.count} entries)\n`;
    });

    text += `\n--- DETAILED EXPENSE LEDGER ---\n`;
    text += `DATE       | AMOUNT       | TITLE & BENEFICIARY [NOTES]\n`;
    text += `--------------------------------------------------------\n`;
    expenses.forEach(e => {
      const person = this.getPersonName(e);
      const personTag = person !== '-' ? ` [For: ${person}]` : '';
      const notesTag = e.notes ? ` (${e.notes})` : '';
      text += `${(e.date || '').padEnd(10)} | ${(currency + parseFloat(e.amount).toLocaleString()).padStart(12)} | ${e.title}${personTag}${notesTag}\n`;
    });

    text += `--------------------------------------------------------\n`;
    text += `GRAND TOTAL : ${currency}${totalSpent.toLocaleString()}\n`;
    text += `========================================================\n`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    this.triggerBlobDownload(blob, `expense-statement-${today}.txt`);

    if (window.app && window.app.showToast) {
      window.app.showToast('Text summary statement (.txt) downloaded!', 'success');
    }
  }

  triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1200);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.reports = new ReportManager();
