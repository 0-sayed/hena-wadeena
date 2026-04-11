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
  text = text.replace(/function formatAmountWithCurrency\(value: number, language: AppLanguage\)[:\s\w]+\{.*?return.*?:\s*('.*?').*?\}/s, '');
  
  text = text.replace(/function formatAmountWithCurrency\(value: number, language: AppLanguage\)[:\s\w]+{\s*return [^}]+\s*}/, '');
  
  text = text.replace(/formatAmountWithCurrency\(([^,]+),\s*language\)/g, "`${formatPrice($1)} ${t('currency')}`");
  text = text.replace(/formatAmountWithCurrency\(([^,]+),\s*appLanguage\)/g, "`${formatPrice($1)} ${t('currency')}`");

  fs.writeFileSync(f, text, 'utf8');
  console.log('Fixed ' + f);
});
