import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { users } from '../db/schema/index';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async findByEmail(email: string): Promise<typeof users.$inferSelect | null> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  }

  async findById(id: string): Promise<typeof users.$inferSelect | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async create(data: { email: string; fullName: string; passwordHash: string; role: string }) {
    const [user] = await this.db
      .insert(users)
      .values({
        email: data.email,
        fullName: data.fullName,
        passwordHash: data.passwordHash,
        role: data.role as typeof users.$inferInsert.role,
      })
      .returning();
    if (!user) throw new InternalServerErrorException('Insert did not return a row');
    return user;
  }

  async updateProfile(
    id: string,
    data: { displayName?: string; avatarUrl?: string; language?: string },
  ) {
    const [user] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  }

  async updateLastLogin(id: string) {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updatePassword(id: string, passwordHash: string) {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id));
  }
}
