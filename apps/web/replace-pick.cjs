const fs = require('fs');
const path = require('path');

const reverseMap = JSON.parse(fs.readFileSync('reverseMap.json', 'utf8'));

// Manual fallbacks in case strings are dynamically constructed or differ slightly
const manualMap = {
  'Guide Dashboard': 'dashboard:guides.dashboard.title',
  'Merchant dashboard': 'dashboard:merchant.title',
  'Resident dashboard': 'dashboard:resident.title',
  'Student dashboard': 'dashboard:student.title',
  'Investor dashboard': 'dashboard:investor.title',
  'Driver dashboard': 'dashboard:driver.title',
  'Job opportunities': 'dashboard:resident.jobs.title',
  'Browse jobs': 'dashboard:resident.jobs.browseJobs',
  'My applications': 'dashboard:resident.jobs.myApplications',
  // Admin strings
  'Tourism map': 'admin:maps.title',
  'Find places, businesses, and guides': 'admin:maps.subtitle',
  'Map and regions data': 'admin:maps.title',
  'Track agricultural commodities and their prices across districts': 'admin:crops.subtitle',
  'Crop settings': 'admin:crops.title',
  'Guides & bookings directory': 'admin:guides.title',
  'Discover the best local guides and book your next trip': 'admin:guides.subtitle'
};

function getTranslationKey(enText) {
  if (reverseMap[enText]) return reverseMap[enText];
  if (manualMap[enText]) return manualMap[enText];
  
  // Try to find if the string matches any value but stripped
  for (const [val, key] of Object.entries(reverseMap)) {
    if (val.trim() === enText.trim()) return key;
  }
  
  return null;
}

function processContent(content, filePath) {
  let modified = content;
  let namespaces = new Set();
  
  // Find all pickLocalizedCopy calls
  // pickLocalizedCopy(appLanguage, { ar: '...', en: '...' })
  // We use a regex that handles newlines and optional quotes type
  const regex = /pickLocalizedCopy[^,]+,\s*\{\s*(?:ar:\s*['"](.*?)['"],\s*en:\s*['"](.*?)['"](?:,\s*)?|en:\s*['"](.*?)['"],\s*ar:\s*['"](.*?)['"](?:,\s*)?)\s*\}\s*\)/gs;
  
  modified = modified.replace(regex, (match, ar1, en1, en2, ar2) => {
    let enText = en1 || en2;
    let arText = ar1 || ar2;
    
    if (!enText) return match;
    
    // We clean escape sequences
    enText = enText.replace(/\\'/g, "'").replace(/\\"/g, '"');
    
    let keyInfo = getTranslationKey(enText);
    if (keyInfo) {
      let [ns, ...keyParts] = keyInfo.split(':');
      let key = keyParts.join(':');
      namespaces.add(ns);
      return `t('${key}')`;
    }
    
    console.log(`NO KEY FOUND for "${enText}" in ${filePath}`);
    // If not found, just fallback to t('MISSING') so it breaks tests explicitly or we fix it
    return `t('${enText}')`;
  });
  
  // add useTranslation hook import and usage
  if (namespaces.size > 0 && modified !== content) {
    let nsArray = Array.from(namespaces).map(n => `'${n}'`).join(', ');
    
    if (!modified.includes('import { useTranslation }')) {
      // Very naive insertion
      const lastImportMatch = modified.match(/^import.*?;/gm);
      if (lastImportMatch) {
         const lastImport = lastImportMatch[lastImportMatch.length - 1];
         modified = modified.replace(lastImport, `${lastImport}\nimport { useTranslation } from 'react-i18next';`);
      } else {
         modified = `import { useTranslation } from 'react-i18next';\n` + modified;
      }
    }
    
    // We assume there is a component definition... This is tricky to automate perfectly without AST.
    // For now, let's just log namespaces so we can add them manually or do a simple replace.
    console.log(`File ${filePath} needs namespaces: ${nsArray}`);
    
    // let's try a naive replace for functional component
    // export default function X() {
    modified = modified.replace(/export default function ([A-Za-z0-9_]+)\([^)]*\)[\s]*\{/, (match) => {
      // check if it already has t calling useTranslation
      if (modified.includes('useTranslation') && modified.includes('const { t }')) {
        return match;
      }
      return `${match}\n  const {\n    t\n  } = useTranslation([${nsArray}]);\n`;
    });
    
    modified = modified.replace(/export function ([A-Za-z0-9_]+)\([^)]*\)[\s]*\{/, (match) => {
      if (modified.includes('useTranslation') && modified.includes('const { t }')) {
        return match;
      }
      return `${match}\n  const {\n    t\n  } = useTranslation([${nsArray}]);\n`;
    });
  }
  
  return modified;
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath);
    } else if (f.endsWith('.tsx')) {
      const content = fs.readFileSync(dirPath, 'utf8');
      if (content.includes('pickLocalizedCopy')) {
        let newContent = processContent(content, dirPath);
        if (newContent !== content) {
          fs.writeFileSync(dirPath, newContent, 'utf8');
          console.log(`Updated ${dirPath}`);
        }
      }
    }
  });
}

walkDir('src');
