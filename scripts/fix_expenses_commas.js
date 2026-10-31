const fs = require('fs');

['public/js/expenses.js', 'docs/js/expenses.js'].forEach(filePath => {
  let js = fs.readFileSync(filePath, 'utf8');

  js = js.replace(
    '  openPocketMoneyModal(giverName = \'\') {\n    this.openIncomeModal(\'pocket\', giverName);\n  },',
    '  openPocketMoneyModal(giverName = \'\') {\n    this.openIncomeModal(\'pocket\', giverName);\n  }'
  );

  js = js.replace(
    '    modal.classList.add(\'active\');\n  },',
    '    modal.classList.add(\'active\');\n  }'
  );

  js = js.replace(
    '      if (btnIncome) {\n        btnIncome.style.background = \'var(--success)\';\n        btnIncome.style.color = \'#fff\';\n      }\n    }\n  },',
    '      if (btnIncome) {\n        btnIncome.style.background = \'var(--success)\';\n        btnIncome.style.color = \'#fff\';\n      }\n    }\n  }'
  );

  js = js.replace(
    '    if (catSelect) {\n      catSelect.value = \'Family Support\';\n    }\n  },',
    '    if (catSelect) {\n      catSelect.value = \'Family Support\';\n    }\n  }'
  );

  fs.writeFileSync(filePath, js, 'utf8');
});
console.log('Fixed class method commas in expenses.js');
