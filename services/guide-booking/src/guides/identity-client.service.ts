import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IdentityClient {
  private readonly logger = new Logger(IdentityClient.name);
  private readonly baseUrl = process.env.IDENTITY_SERVICE_URL ?? 'http://identity:8001';
  private readonly secret = process.env.INTERNAL_SECRET ?? '';

  async getDisplayName(userId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/internal/users/${userId}`, {
        headers: { 'X-Internal-Secret': this.secret },
      });
      if (!response.ok) return null;
      const body = (await response.json()) as {
        display_name?: string | null;
        full_name?: string | null;
      };
      return body.display_name ?? body.full_name ?? null;
    } catch (error) {
      this.logger.warn(`Failed to fetch display name for user ${userId}: ${String(error)}`);
      return null;
    }
  }
}
