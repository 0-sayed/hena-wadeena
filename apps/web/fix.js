const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/, :/g, ' :');
    
    content = content.replace(/(\([^)]+\)\s*\?\?\s*[a-zA-Z0-9_.]+\s*\?\?\s*['\x22]+)\s*\|\|/g, '($1) ||');
    content = content.replace(/(\([^)]+\)\s*\?\?\s*[a-zA-Z0-9_.]+\s*\?\?\s*['\x22]+)\s*\?\?/g, '($1) ??');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed ' + filePath);
    }
  }
});
