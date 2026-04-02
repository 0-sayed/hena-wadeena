import { KycDocType, UserRole } from '../enums';

export const ROLE_REQUIRED_KYC_DOCUMENTS: Partial<Record<UserRole, readonly KycDocType[]>> = {
  [UserRole.GUIDE]: [KycDocType.NATIONAL_ID, KycDocType.GUIDE_LICENSE],
  [UserRole.MERCHANT]: [KycDocType.NATIONAL_ID, KycDocType.COMMERCIAL_REGISTER],
  [UserRole.INVESTOR]: [KycDocType.NATIONAL_ID],
  [UserRole.STUDENT]: [KycDocType.NATIONAL_ID, KycDocType.STUDENT_ID],
  [UserRole.DRIVER]: [KycDocType.NATIONAL_ID],
};

const EMPTY_REQUIRED_KYC_DOCUMENTS: readonly KycDocType[] = [];

export function getRequiredKycDocuments(role: string): readonly KycDocType[] {
  if (!Object.values(UserRole).includes(role as UserRole)) {
    return EMPTY_REQUIRED_KYC_DOCUMENTS;
  }

  return ROLE_REQUIRED_KYC_DOCUMENTS[role as UserRole] ?? EMPTY_REQUIRED_KYC_DOCUMENTS;
}

export function requiresKycForRole(role: string): boolean {
  return getRequiredKycDocuments(role).length > 0;
}
