export interface EmailOptions {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  fromEmail: string;
  fromName: string;
  apiKey: string;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': opts.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: opts.fromName, email: opts.fromEmail },
      to: [{ email: opts.to.email, name: opts.to.name ?? opts.to.email }],
      subject: opts.subject,
      htmlContent: opts.html,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Brevo error: ${JSON.stringify(err)}`);
  }
}

export function inviteEmailHtml(name: string, email: string, tempPassword: string, appUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; background: #f9fafb; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; border: 1px solid #e5e7eb;">
    <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 8px;">You've been invited to Debtrac</h1>
    <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">Hi ${name}, you can now log in with the credentials below.</p>
    <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 6px; font-size: 13px; color: #64748b;">Email</p>
      <p style="margin: 0 0 14px; font-size: 15px; font-weight: 600; color: #0f172a;">${email}</p>
      <p style="margin: 0 0 6px; font-size: 13px; color: #64748b;">Temporary Password</p>
      <p style="margin: 0; font-size: 15px; font-weight: 600; color: #0f172a; letter-spacing: 1px;">${tempPassword}</p>
    </div>
    <a href="${appUrl}/login" style="display: block; background: #0f172a; color: white; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">Sign In to Debtrac</a>
    <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0; text-align: center;">You will be prompted to change your password on first login.</p>
  </div>
</body>
</html>`;
}
