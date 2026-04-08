export type IncomeBracket = 'low' | 'mid' | 'high';
export type Employment = 'employed' | 'self_employed' | 'unemployed' | 'farmer';

export type WizardAnswers = {
  householdSize: number;
  incomeBracket: IncomeBracket;
  headAge: number;
  hasDisability: boolean;
  employment: Employment;
  ownsLand: boolean;
};

// Income midpoints for rule evaluation (EGP/month)
const INCOME_MIDPOINTS: Record<IncomeBracket, number> = {
  low: 1000, // < 1,500
  mid: 2000, // 1,500–3,000
  high: 4000, // > 3,000
};

export function getMatchedSlugs(answers: WizardAnswers): string[] {
  const income = INCOME_MIDPOINTS[answers.incomeBracket];
  const matched: string[] = [];

  // takaful-wa-karama: income < 3000 AND (age >= 65 OR household_size >= 3)
  if (income < 3000 && (answers.headAge >= 65 || answers.householdSize >= 3)) {
    matched.push('takaful-wa-karama');
  }

  // sakan-karim: income < 3000
  if (income < 3000) {
    matched.push('sakan-karim');
  }

  // tamween: universal
  matched.push('tamween');

  // disability-allowance
  if (answers.hasDisability) {
    matched.push('disability-allowance');
  }

  // non-contributory-pension: age >= 65 AND not formally employed
  if (answers.headAge >= 65 && answers.employment !== 'employed') {
    matched.push('non-contributory-pension');
  }

  // solar-pump-grant: farmer with land
  if (answers.employment === 'farmer' && answers.ownsLand) {
    matched.push('solar-pump-grant');
  }

  return matched;
}
