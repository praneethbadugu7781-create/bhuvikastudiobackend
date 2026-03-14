export async function sendOtpEmail(email, code) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error('RESEND_API_KEY not configured');

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Bhuvika Studio <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: 'Your Bhuvika Studio Login Code',
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
          <h2 style="color:#7c3aed;">Bhuvika Studio</h2>
          <p>Your login verification code is:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f3f0ff;border-radius:8px;color:#7c3aed;">
            ${code}
          </div>
          <p style="color:#666;font-size:14px;margin-top:16px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error: ${body}`);
  }

  return res.json();
}
