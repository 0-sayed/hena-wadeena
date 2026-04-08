import { describe, expect, it } from 'vitest';

import { getMatchedSlugs } from '../../lib/benefits-eligibility';

const base = {
  householdSize: 2,
  incomeBracket: 'mid' as const,
  headAge: 40,
  hasDisability: false,
  employment: 'employed' as const,
  ownsLand: false,
};

describe('getMatchedSlugs', () => {
  // tamween — always matches
  it('always includes tamween regardless of answers', () => {
    expect(getMatchedSlugs(base)).toContain('tamween');
  });

  it('includes tamween even for high earners', () => {
    expect(getMatchedSlugs({ ...base, incomeBracket: 'high' })).toContain('tamween');
  });

  // takaful-wa-karama: income < 3000 AND (age >= 65 OR household_size >= 3)
  it('matches takaful-wa-karama for low-income elderly', () => {
    const slugs = getMatchedSlugs({ ...base, incomeBracket: 'low', headAge: 70 });
    expect(slugs).toContain('takaful-wa-karama');
  });

  it('matches takaful-wa-karama for low-income large family', () => {
    const slugs = getMatchedSlugs({ ...base, incomeBracket: 'low', householdSize: 4 });
    expect(slugs).toContain('takaful-wa-karama');
  });

  it('does NOT match takaful-wa-karama for high income', () => {
    const slugs = getMatchedSlugs({ ...base, incomeBracket: 'high', headAge: 70 });
    expect(slugs).not.toContain('takaful-wa-karama');
  });

  it('does NOT match takaful-wa-karama for low income but small young household', () => {
    const slugs = getMatchedSlugs({ ...base, incomeBracket: 'low', headAge: 40, householdSize: 2 });
    expect(slugs).not.toContain('takaful-wa-karama');
  });

  it('does not match mid income with young, small household', () => {
    const result = getMatchedSlugs({
      householdSize: 2,
      incomeBracket: 'mid',
      headAge: 30,
      hasDisability: false,
      employment: 'employed',
      ownsLand: false,
    });
    expect(result).not.toContain('takaful-wa-karama');
  });

  // sakan-karim: income < 3000
  it('matches sakan-karim for low income', () => {
    expect(getMatchedSlugs({ ...base, incomeBracket: 'low' })).toContain('sakan-karim');
  });

  it('matches sakan-karim for mid income', () => {
    expect(getMatchedSlugs({ ...base, incomeBracket: 'mid' })).toContain('sakan-karim');
  });

  it('does NOT match sakan-karim for high income', () => {
    expect(getMatchedSlugs({ ...base, incomeBracket: 'high' })).not.toContain('sakan-karim');
  });

  // disability-allowance: hasDisability === true
  it('matches disability-allowance when household has a disability', () => {
    expect(getMatchedSlugs({ ...base, hasDisability: true })).toContain('disability-allowance');
  });

  it('does NOT match disability-allowance when no disability', () => {
    expect(getMatchedSlugs(base)).not.toContain('disability-allowance');
  });

  // non-contributory-pension: age >= 65 AND employment !== 'employed'
  it('matches non-contributory-pension for retired elderly', () => {
    const slugs = getMatchedSlugs({ ...base, headAge: 66, employment: 'unemployed' });
    expect(slugs).toContain('non-contributory-pension');
  });

  it('matches non-contributory-pension for elderly self-employed', () => {
    const slugs = getMatchedSlugs({ ...base, headAge: 65, employment: 'self_employed' });
    expect(slugs).toContain('non-contributory-pension');
  });

  it('does NOT match non-contributory-pension for formally employed elderly', () => {
    const slugs = getMatchedSlugs({ ...base, headAge: 70, employment: 'employed' });
    expect(slugs).not.toContain('non-contributory-pension');
  });

  it('does NOT match non-contributory-pension for unemployed under 65', () => {
    const slugs = getMatchedSlugs({ ...base, headAge: 50, employment: 'unemployed' });
    expect(slugs).not.toContain('non-contributory-pension');
  });

  // solar-pump-grant: employment === 'farmer' AND ownsLand === true
  it('matches solar-pump-grant for land-owning farmer', () => {
    const slugs = getMatchedSlugs({ ...base, employment: 'farmer', ownsLand: true });
    expect(slugs).toContain('solar-pump-grant');
  });

  it('does NOT match solar-pump-grant for farmer without land', () => {
    const slugs = getMatchedSlugs({ ...base, employment: 'farmer', ownsLand: false });
    expect(slugs).not.toContain('solar-pump-grant');
  });

  it('does NOT match solar-pump-grant for non-farmer', () => {
    const slugs = getMatchedSlugs({ ...base, employment: 'employed', ownsLand: true });
    expect(slugs).not.toContain('solar-pump-grant');
  });
});
