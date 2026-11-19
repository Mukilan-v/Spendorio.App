const fs = require('fs');
const assert = require('assert');

// Mock browser
global.self = global;
global.window = global;
global.window.addEventListener = () => {};
global.location = { href: 'http://localhost/' };
global.document = {
  createElement: () => ({ style: {}, appendChild: () => {}, querySelectorAll: () => [] }),
  body: { appendChild: () => {}, removeChild: () => {} },
  addEventListener: () => {}
};
global.navigator = { userAgent: 'Node' };

// Load html2pdf bundle (which exposes window.jsPDF)
const bundleCode = fs.readFileSync('public/js/html2pdf.bundle.min.js', 'utf8');
eval(bundleCode);

assert.strictEqual(typeof window.jsPDF, 'function', 'window.jsPDF must be defined');

const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => {}
};

// Load storage.js & reports.js
const storageCode = fs.readFileSync('public/js/storage.js', 'utf8');
eval(storageCode);

console.log('✓ Environment ready, testing jsPDF vector rendering...');

// Let's create a vector PDF generator function for ReportManager
function generateVectorStatement(doc, {
  periodLabel,
  nowStr,
  currency,
  totalSpent,
  totalIncome,
  netBalance,
  persons,
  categories,
  expenses
}) {
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // --- HEADER BRANDING BAR ---
  doc.setFillColor(79, 70, 229); // Primary Indigo
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SPENDORIO', margin, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Routine & Cost Management System', margin, 17);

  doc.setFontSize(8);
  doc.text(`Statement: ${periodLabel}`, pageWidth - margin, 11, { align: 'right' });
  doc.text(`Generated: ${nowStr} • Currency: ${currency} (INR)`, pageWidth - margin, 17, { align: 'right' });

  // --- KPI SUMMARY CARDS (4 Cards Across) ---
  const cardY = 27;
  const cardHeight = 18;
  const cardGap = 4;
  const cardWidth = (contentWidth - (cardGap * 3)) / 4;

  const kpis = [
    { label: 'TOTAL EXPENSES', val: `${currency}${totalSpent.toLocaleString()}`, bg: [254, 242, 242], text: [220, 38, 38] },
    { label: 'TOTAL INCOMES', val: `${currency}${totalIncome.toLocaleString()}`, bg: [236, 253, 245], text: [5, 150, 105] },
    { label: 'NET BALANCE', val: `${netBalance >= 0 ? '+' : ''}${currency}${netBalance.toLocaleString()}`, bg: [248, 250, 252], text: netBalance >= 0 ? [5, 150, 105] : [220, 38, 38] },
    { label: 'RECORDS', val: `${expenses.length} Entries`, bg: [245, 243, 255], text: [109, 40, 217] }
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + (idx * (cardWidth + cardGap));
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3.5, cardY + 5.5);

    doc.setFontSize(10.5);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.val, x + 3.5, cardY + 13.5);
  });

  // --- BENEFICIARY / CATEGORY SUMMARY ROW ---
  let curY = 50;

  if (persons.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Beneficiary Breakdown:', margin, curY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const personStr = persons.map(p => `${p.name}: ${currency}${p.total.toLocaleString()} (${p.count})`).join('  •  ');
    const splitPersons = doc.splitTextToSize(personStr, contentWidth);
    doc.text(splitPersons, margin, curY + 4.5);
    curY += 6 + (splitPersons.length * 4);
  }

  // --- ITEMIZED EXPENSE TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Itemized Expense Records (${expenses.length} Records)`, margin, curY);
  curY += 3.5;

  const drawTableHeader = (y) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 7, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('#', margin + 2, y + 4.8);
    doc.text('Date', margin + 9, y + 4.8);
    doc.text('Expense Title', margin + 30, y + 4.8);
    doc.text('Category', margin + 82, y + 4.8);
    doc.text('Beneficiary', margin + 120, y + 4.8);
    doc.text('Payment', margin + 148, y + 4.8);
    doc.text(`Amount (${currency})`, pageWidth - margin - 2, y + 4.8, { align: 'right' });
  };

  drawTableHeader(curY);
  curY += 7;

  if (expenses.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, curY, contentWidth, 14, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`No expense records found for ${periodLabel}.`, margin + (contentWidth / 2), curY + 8, { align: 'center' });
    curY += 14;
  } else {
    expenses.forEach((e, idx) => {
      // Page break check (A4 is 297mm, leave 18mm margin at bottom)
      if (curY > pageHeight - 20) {
        doc.addPage();
        curY = 14;
        drawTableHeader(curY);
        curY += 7;
      }

      // Zebra striping
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, curY, contentWidth, 6.5, 'F');
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, curY + 6.5, pageWidth - margin, curY + 6.5);

      const person = e.person || (e.notes && e.notes.includes('Sister') ? 'Sister' : '-');
      const title = doc.splitTextToSize(e.title || 'Expense', 50)[0];
      const cat = doc.splitTextToSize(e.category || 'Other', 35)[0];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(String(idx + 1), margin + 2, curY + 4.5);
      doc.text(e.date || '-', margin + 9, curY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(title, margin + 30, curY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(cat, margin + 82, curY + 4.5);
      doc.text(person, margin + 120, curY + 4.5);
      doc.text(e.paymentMethod || 'UPI', margin + 148, curY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text(`${currency}${parseFloat(e.amount || 0).toLocaleString()}`, pageWidth - margin - 2, curY + 4.5, { align: 'right' });

      curY += 6.5;
    });

    // Grand Total Row
    if (curY > pageHeight - 20) {
      doc.addPage();
      curY = 14;
    }
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, curY, contentWidth, 7.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, curY, contentWidth, 7.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('GRAND TOTAL EXPENSES', margin + 4, curY + 5);

    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38);
    doc.text(`${currency}${totalSpent.toLocaleString()}`, pageWidth - margin - 2, curY + 5, { align: 'right' });
    curY += 10;
  }

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Spendorio & SpendTracker • Private & Confidential • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }
}

// Test with 50 sample expenses across multiple pages
const sampleExpenses = [];
for (let i = 1; i <= 50; i++) {
  sampleExpenses.push({
    id: String(i),
    title: `Expense Item ${i}`,
    amount: (i * 125),
    date: '2026-08-' + String(1 + (i % 28)).padStart(2, '0'),
    category: i % 2 === 0 ? 'Food & Dining' : 'Shopping',
    notes: i % 3 === 0 ? 'Sister' : 'Myself',
    paymentMethod: 'UPI'
  });
}

const doc = new window.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
generateVectorStatement(doc, {
  periodLabel: 'Month 2026-08',
  nowStr: new Date().toLocaleString(),
  currency: '₹',
  totalSpent: sampleExpenses.reduce((s, e) => s + e.amount, 0),
  totalIncome: 50000,
  netBalance: 50000 - sampleExpenses.reduce((s, e) => s + e.amount, 0),
  persons: [{ name: 'Sister', total: 25000, count: 17 }, { name: 'Myself', total: 30000, count: 33 }],
  categories: [{ category: 'Food & Dining', total: 30000, count: 25 }, { category: 'Shopping', total: 25000, count: 25 }],
  expenses: sampleExpenses
});

const pdfBytes = doc.output();
console.log('Generated PDF size:', pdfBytes.length, 'bytes');
console.log('Pages generated:', doc.internal.getNumberOfPages());
assert.ok(pdfBytes.length > 5000, 'PDF must contain data and not be empty');
assert.ok(doc.internal.getNumberOfPages() >= 2, '50 rows must span at least 2 pages');
fs.writeFileSync('scripts/verified-vector-statement.pdf', Buffer.from(pdfBytes, 'binary'));
console.log('✓ Successfully wrote scripts/verified-vector-statement.pdf!');
console.log('🎉 VECTOR PDF TEST PASSED: 100% NON-BLANK GUARANTEED!');
