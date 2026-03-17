export async function sendOtpEmail(email, code) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Bhuvika Studio <otp@bhuvikastudio.com>',
      to: [email],
      subject: 'Your Bhuvika Studio Login Code',
      html: `
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
    console.error('Resend API error:', body);
    throw new Error(`Email send failed: ${body}`);
  }

  const data = await res.json();
  console.log('OTP email sent to:', email, 'messageId:', data.id);
  return data;
}

const statusMessages = {
  CONFIRMED: {
    emoji: '✅',
    title: 'Order Confirmed!',
    message: 'Great news! Your order has been confirmed and is being prepared.',
    color: '#4ade80',
  },
  PACKED: {
    emoji: '📦',
    title: 'Order Packed!',
    message: 'Your order has been carefully packed and is ready for shipping.',
    color: '#818cf8',
  },
  SHIPPED: {
    emoji: '🚚',
    title: 'Order Shipped!',
    message: 'Your order is on its way! It will be delivered to you soon.',
    color: '#a855f7',
  },
  DELIVERED: {
    emoji: '🎉',
    title: 'Order Delivered!',
    message: 'Your order has been delivered. We hope you love your purchase!',
    color: '#22c55e',
  },
  CANCELLED: {
    emoji: '❌',
    title: 'Order Cancelled',
    message: 'Your order has been cancelled. If you have any questions, please contact us.',
    color: '#ef4444',
  },
};

export async function sendOrderStatusEmail(email, order, newStatus) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured, skipping order status email');
    return null;
  }

  const statusInfo = statusMessages[newStatus];
  if (!statusInfo) return null;

  const orderId = order._id?.toString() || order.id;
  const shortOrderId = orderId.slice(0, 8).toUpperCase();
  const itemsList = order.items.map(item =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${item.productName}</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;">${item.size}</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;">x${item.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">₹${item.unitPrice}</td></tr>`
  ).join('');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Bhuvika Studio <orders@bhuvikastudio.com>',
      to: [email],
      subject: `${statusInfo.emoji} ${statusInfo.title} - Order #${shortOrderId}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#1a1a1a;font-size:24px;font-weight:600;margin:0;letter-spacing:4px;">BHUVIKA STUDIO</h1>
            <div style="width:60px;height:2px;background:#e8728a;margin:8px auto 0;"></div>
          </div>

          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;margin-bottom:8px;">${statusInfo.emoji}</div>
            <h2 style="color:${statusInfo.color};font-size:24px;margin:0 0 8px;">${statusInfo.title}</h2>
            <p style="color:#666;font-size:14px;margin:0;">${statusInfo.message}</p>
          </div>

          <div style="background:#f8f8f8;border-radius:12px;padding:20px;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Order ID</p>
            <p style="margin:0;font-size:16px;font-weight:600;color:#1a1a1a;font-family:monospace;">#${shortOrderId}</p>
          </div>

          <div style="margin-bottom:20px;">
            <p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0 0 12px;">Order Items</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="border-bottom:2px solid #e8728a;">
                  <th style="text-align:left;padding:8px 0;color:#888;">Item</th>
                  <th style="text-align:center;padding:8px 0;color:#888;">Size</th>
                  <th style="text-align:center;padding:8px 0;color:#888;">Qty</th>
                  <th style="text-align:right;padding:8px 0;color:#888;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>
          </div>

          <div style="background:#1a1a1a;border-radius:12px;padding:20px;color:#fff;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="color:#aaa;">Subtotal</span>
              <span>₹${order.subtotal}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
              <span style="color:#aaa;">Delivery</span>
              <span>${order.deliveryCharge === 0 ? 'FREE' : '₹' + order.deliveryCharge}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:bold;padding-top:12px;border-top:1px solid #333;">
              <span>Total</span>
              <span>₹${order.totalAmount}</span>
            </div>
          </div>

          ${order.address ? `
          <div style="margin-top:20px;padding:16px;border:1px solid #eee;border-radius:12px;">
            <p style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Shipping To</p>
            <p style="margin:0;font-weight:600;color:#1a1a1a;">${order.address.fullName}</p>
            <p style="margin:4px 0 0;color:#666;font-size:14px;">${order.address.line1}</p>
            <p style="margin:4px 0 0;color:#666;font-size:14px;">${order.address.city}, ${order.address.state} - ${order.address.postalCode}</p>
            <p style="margin:8px 0 0;color:#1a1a1a;font-size:14px;">📞 ${order.address.phone}</p>
          </div>
          ` : ''}

          <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0 16px;" />
          <p style="color:#aaa;font-size:11px;text-align:center;margin:0;">
            Thank you for shopping with Bhuvika Studio!<br/>
            Questions? Reply to this email or visit bhuvikastudio.com
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Order status email error:', body);
    return null;
  }

  const data = await res.json();
  console.log('Order status email sent to:', email, 'status:', newStatus);
  return data;
}
