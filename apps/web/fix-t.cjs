const fs = require('fs');

const files = [
  'src/pages/roles/GuideDashboard.tsx',
  'src/pages/roles/InvestorDashboard.tsx',
  'src/pages/roles/MerchantDashboard.tsx',
  'src/pages/roles/StudentDashboard.tsx'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let text = fs.readFileSync(f, 'utf8');
  
  // Convert standalone formatAmountWithCurrency format
  text = text.replace(/function formatAmountWithCurrency[^{]+\{.*?return.*?\}/s, '');
  
  text = text.replace(/formatAmountWithCurrency\(([^,]+)(?:,\s*language|,\s*appLanguage)?\)/g, "`${formatPrice($1)} ${t('currency')}`");

  fs.writeFileSync(f, text, 'utf8');
  console.log('Fixed ' + f);
});
