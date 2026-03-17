export async function sendOtpEmail(email, code) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not configured');

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: 'Bhuvika Studio',
        email: process.env.BREVO_FROM_EMAIL || 'noreply@bhuvikastudio.com',
      },
      to: [{ email }],
      subject: 'Your Bhuvika Studio Login Code',
      htmlContent: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#1a1a1a;font-size:24px;font-weight:600;margin:0;letter-spacing:4px;">BHUVIKA STUDIO</h1>
            <div style="width:60px;height:2px;background:#e8728a;margin:8px auto 0;"></div>
          </div>
          <div style="background:#fce4ec;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
            <p style="color:#666;font-size:14px;margin:0 0 12px;">Your verification code is</p>
            <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#e8728a;font-family:monospace;">
              ${code}
            </div>
          </div>
          <p style="color:#888;font-size:13px;text-align:center;margin:0;">
            This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
          </p>
          <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0 16px;" />
          <p style="color:#aaa;font-size:11px;text-align:center;margin:0;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Brevo API error:', body);
    throw new Error(`Email send failed: ${body}`);
  }

  const data = await res.json();
  console.log('OTP email sent to:', email, 'messageId:', data.messageId);
  return data;
}
