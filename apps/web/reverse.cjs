const fs = require('fs');
const path = require('path');

const map = {};

function flatten(obj, prefix, ns) {
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      flatten(obj[key], prefix + key + '.', ns);
    } else {
      map[obj[key]] = ns + ':' + prefix + key;
    }
  }
}

const localesDir = path.join(__dirname, 'src', 'locales', 'en');
fs.readdirSync(localesDir).forEach(file => {
  if (file.endsWith('.json')) {
    const ns = file.replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
    flatten(data, '', ns);
  }
});

// Write to a JSON file to inspect
fs.writeFileSync('reverseMap.json', JSON.stringify(map, null, 2), 'utf8');
console.log('Reverse map written');
