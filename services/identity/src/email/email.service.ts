import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.from = this.config.get<string>('EMAIL_FROM', 'Hena Wadeena <noreply@henawadeena.com>');
  }

  async sendPasswordResetOtp(to: string, otp: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: [to],
      subject: 'رمز إعادة تعيين كلمة المرور - Hena Wadeena',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>إعادة تعيين كلمة المرور</h2>
          <p>رمز التحقق الخاص بك هو:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">${otp}</p>
          <p>هذا الرمز صالح لمدة 10 دقائق.</p>
          <p>إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد.</p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send password reset OTP to ${to}: ${error.message}`);
      throw new Error('Failed to send password reset email');
    }
  }
}
