const fs = require('fs');

['public/index.html', 'docs/index.html'].forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const targetStart = "if ('caches' in window)";
  const targetEnd = "// Immediate Inline Feedback";
  const start = content.indexOf(targetStart);
  const end = content.indexOf(targetEnd);

  console.log(f, 'start:', start, 'end:', end);
  if (start !== -1 && end !== -1) {
    content = content.substring(0, start) + '// Cache lifecycle is managed by sw.js\n\n    ' + content.substring(end);
    fs.writeFileSync(f, content, 'utf8');
    console.log('Successfully removed cache purge from', f);
  }
});
