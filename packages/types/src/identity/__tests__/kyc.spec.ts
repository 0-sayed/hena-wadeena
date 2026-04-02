import { KycDocType, UserRole } from '../../enums';
import {
  getRequiredKycDocuments,
  requiresKycForRole,
  ROLE_REQUIRED_KYC_DOCUMENTS,
} from '../kyc';

import { describe, expect, it } from 'vitest';

describe('KYC role mapping', () => {
  it('defines the supported KYC roles and their required documents', () => {
    expect(ROLE_REQUIRED_KYC_DOCUMENTS[UserRole.GUIDE]).toEqual([
      KycDocType.NATIONAL_ID,
      KycDocType.GUIDE_LICENSE,
    ]);
    expect(ROLE_REQUIRED_KYC_DOCUMENTS[UserRole.MERCHANT]).toEqual([
      KycDocType.NATIONAL_ID,
      KycDocType.COMMERCIAL_REGISTER,
    ]);
    expect(ROLE_REQUIRED_KYC_DOCUMENTS[UserRole.INVESTOR]).toEqual([KycDocType.NATIONAL_ID]);
    expect(ROLE_REQUIRED_KYC_DOCUMENTS[UserRole.STUDENT]).toEqual([
      KycDocType.NATIONAL_ID,
      KycDocType.STUDENT_ID,
    ]);
    expect(ROLE_REQUIRED_KYC_DOCUMENTS[UserRole.DRIVER]).toEqual([KycDocType.NATIONAL_ID]);
  });

  it('returns an empty list for roles that do not require KYC', () => {
    expect(getRequiredKycDocuments(UserRole.TOURIST)).toEqual([]);
    expect(getRequiredKycDocuments(UserRole.RESIDENT)).toEqual([]);
  });

  it('detects whether a role requires KYC', () => {
    expect(requiresKycForRole(UserRole.GUIDE)).toBe(true);
    expect(requiresKycForRole(UserRole.DRIVER)).toBe(true);
    expect(requiresKycForRole(UserRole.TOURIST)).toBe(false);
  });
});
