import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IdentityClient {
  private readonly logger = new Logger(IdentityClient.name);
  private readonly baseUrl = process.env.IDENTITY_SERVICE_URL ?? 'http://identity:8001';
  private readonly secret = process.env.INTERNAL_SECRET ?? '';

  async getDisplayName(userId: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); }, 5_000);

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/internal/users/${encodeURIComponent(userId)}`,
        {
          headers: { 'X-Internal-Secret': this.secret, Accept: 'application/json' },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.warn('Identity lookup returned non-OK status', {
          userId,
          status: response.status,
          statusText: response.statusText,
          body: body.slice(0, 200),
        });
        return null;
      }

      const data = (await response.json()) as {
        display_name?: string | null;
        full_name?: string | null;
      };
      return data.display_name ?? data.full_name ?? null;
    } catch (error) {
      this.logger.warn('Failed to fetch display name for user', { userId, error: String(error) });
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
