import { relations } from 'drizzle-orm';

export { identitySchema } from '../schema';
export * from '../enums';
export { users } from './users';
export { authTokens } from './auth-tokens';
export { otpCodes } from './otp-codes';
export { auditEvents } from './audit-events';
export { notifications } from './notifications';
export { userKyc } from './user-kyc';
export { tsvector } from './types';

import { auditEvents } from './audit-events';
import { authTokens } from './auth-tokens';
import { notifications } from './notifications';
import { userKyc } from './user-kyc';
import { users } from './users';

export const usersRelations = relations(users, ({ many }) => ({
  authTokens: many(authTokens),
  auditEvents: many(auditEvents),
  notifications: many(notifications),
  kycSubmissions: many(userKyc),
}));

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(users, { fields: [authTokens.userId], references: [users.id] }),
}));

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  user: one(users, { fields: [auditEvents.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const userKycRelations = relations(userKyc, ({ one }) => ({
  user: one(users, { fields: [userKyc.userId], references: [users.id] }),
  reviewer: one(users, { fields: [userKyc.reviewedBy], references: [users.id] }),
}));
