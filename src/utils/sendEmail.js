import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendOtpEmail(email, code) {
  const from = process.env.GMAIL_USER;
  if (!from) throw new Error('GMAIL_USER not configured');
  if (!process.env.GMAIL_APP_PASSWORD) throw new Error('GMAIL_APP_PASSWORD not configured');

  const transport = getTransporter();

  const info = await transport.sendMail({
    from: `Bhuvika Studio <${from}>`,
    to: email,
    subject: 'Your Bhuvika Studio Login Code',
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
        <h2 style="color:#e8728a;">Bhuvika Studio</h2>
        <p>Your login verification code is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#fce4ec;border-radius:8px;color:#e8728a;">
          ${code}
        </div>
        <p style="color:#666;font-size:14px;margin-top:16px;">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });

  console.log('OTP email sent to:', email, 'messageId:', info.messageId);
  return info;
}
