import { relations } from 'drizzle-orm';

export { identitySchema } from '../schema';
export * from '../enums';
export { users } from './users';
export { authTokens } from './auth-tokens';
export { otpCodes } from './otp-codes';
export { auditEvents } from './audit-events';

import { auditEvents } from './audit-events';
import { authTokens } from './auth-tokens';
import { users } from './users';

export const usersRelations = relations(users, ({ many }) => ({
  authTokens: many(authTokens),
  auditEvents: many(auditEvents),
}));

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(users, { fields: [authTokens.userId], references: [users.id] }),
}));

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  user: one(users, { fields: [auditEvents.userId], references: [users.id] }),
}));
