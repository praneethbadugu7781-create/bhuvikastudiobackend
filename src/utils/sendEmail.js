import PDFDocument from 'pdfkit';
import Product from '../models/Product.js';

export async function generateInvoicePdf(order) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData.toString('base64'));
      });

      // Header Brand Title
      doc.fillColor('#7f3e47').fontSize(24).font('Helvetica-Bold').text('BHUVIKA STUDIO', { align: 'center', letterSpacing: 2 });
      doc.fillColor('#b8848a').fontSize(10).font('Helvetica').text('Vijayawada, Andhra Pradesh, India', { align: 'center' });
      doc.text('Email: orders@bhuvikastudio.com | Website: bhuvikastudio.com', { align: 'center' });
      
      doc.moveDown(1);
      
      // Horizontal Line
      doc.strokeColor('#e5a4b8').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Metadata & Customer Details
      const detailsY = doc.y;
      doc.fillColor('#4d3a3f').fontSize(14).font('Helvetica-Bold').text('INVOICE', 40, detailsY);
      doc.fontSize(10).font('Helvetica')
        .text(`Order ID: #${order._id ? order._id.toString().toUpperCase().slice(0, 8) : order.id?.toString().toUpperCase().slice(0, 8)}`)
        .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`)
        .text(`Payment: ${order.paymentMethod} (${order.paymentStatus})`);

      doc.font('Helvetica-Bold').text('SHIPPING TO', 300, detailsY);
      doc.font('Helvetica')
        .text(order.address?.fullName || '')
        .text(order.address?.line1 || '')
        .text(order.address?.line2 || '')
        .text(`${order.address?.city || ''}, ${order.address?.state || ''} - ${order.address?.postalCode || ''}`)
        .text(`Phone: ${order.address?.phone || ''}`);

      doc.moveDown(1.5);
      
      // Horizontal Line
      doc.strokeColor('#e5a4b8').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Table Header
      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#7f3e47');
      doc.text('Product Name', 40, tableTop);
      doc.text('Size', 280, tableTop, { width: 50, align: 'center' });
      doc.text('Qty', 340, tableTop, { width: 30, align: 'center' });
      doc.text('Unit Price', 380, tableTop, { width: 80, align: 'right' });
      doc.text('Total', 470, tableTop, { width: 85, align: 'right' });
      
      doc.moveDown(0.5);
      doc.strokeColor('#f5b9cb').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Items Row
      doc.fontSize(9).font('Helvetica').fillColor('#4d3a3f');
      for (const item of order.items) {
        let imgBuffer = null;
        try {
          if (item.productId) {
            const product = await Product.findById(item.productId);
            if (product && product.images && product.images.length > 0) {
              const imgRes = await fetch(product.images[0].imageUrl);
              if (imgRes.ok) {
                imgBuffer = Buffer.from(await imgRes.arrayBuffer());
              }
            }
          }
        } catch (err) {
          console.error("Failed to load image for PDF invoice:", err);
        }

        const itemY = doc.y;
        
        if (imgBuffer) {
          try {
            doc.image(imgBuffer, 40, itemY, { width: 30, height: 30 });
            doc.text(item.productName, 80, itemY + 10, { width: 190 });
          } catch (e) {
            doc.text(item.productName, 40, itemY, { width: 230 });
          }
        } else {
          doc.text(item.productName, 40, itemY, { width: 230 });
        }

        const verticalAlign = imgBuffer ? 10 : 0;
        doc.text(item.size || 'N/A', 280, itemY + verticalAlign, { width: 50, align: 'center' });
        doc.text(item.quantity.toString(), 340, itemY + verticalAlign, { width: 30, align: 'center' });
        doc.text(`₹${item.unitPrice.toLocaleString('en-IN')}`, 380, itemY + verticalAlign, { width: 80, align: 'right' });
        doc.text(`₹${(item.unitPrice * item.quantity).toLocaleString('en-IN')}`, 470, itemY + verticalAlign, { width: 85, align: 'right' });

        doc.moveDown(imgBuffer ? 1.8 : 1.2);
        doc.strokeColor('#fce4ec').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(0.5);
      }

      doc.moveDown(0.5);
      
      // Total box
      const totalY = doc.y;
      doc.rect(320, totalY, 235, 90).fill('#fce4ec');
      doc.fillColor('#7f3e47').fontSize(10).font('Helvetica-Bold');
      
      doc.text('Subtotal:', 340, totalY + 15);
      doc.text(`₹${order.subtotal.toLocaleString('en-IN')}`, 480, totalY + 15, { align: 'right', width: 60 });
      
      doc.font('Helvetica');
      doc.text('Shipping:', 340, totalY + 32);
      doc.text(order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`, 480, totalY + 32, { align: 'right', width: 60 });
      
      if (order.couponDiscount > 0) {
        doc.text(`Discount (${order.couponCode || 'Coupon'}):`, 340, totalY + 49);
        doc.text(`-₹${order.couponDiscount.toLocaleString('en-IN')}`, 480, totalY + 49, { align: 'right', width: 60 });
      }

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Grand Total:', 340, totalY + 68);
      doc.text(`₹${order.totalAmount.toLocaleString('en-IN')}`, 460, totalY + 68, { align: 'right', width: 80 });

      // Thank you
      doc.moveDown(7);
      doc.fillColor('#b8848a').fontSize(10).font('Helvetica').text('Thank you for shopping with Bhuvika Studio!', { align: 'center' });
      doc.fontSize(8).text('This is a computer-generated invoice and does not require a physical signature.', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

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

  const emailPayload = {
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

        ${newStatus === 'SHIPPED' && order.trackingNumber ? `
        <div style="margin-top:20px;padding:20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;color:#fff;">
          <p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;opacity:0.8;">📦 Tracking Information</p>
          <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:12px;margin-bottom:12px;">
            <p style="margin:0 0 4px;font-size:12px;opacity:0.8;">Tracking Number</p>
            <p style="margin:0;font-size:18px;font-weight:bold;letter-spacing:1px;">${order.trackingNumber}</p>
          </div>
          ${order.courierCompany ? `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p style="margin:0 0 4px;font-size:12px;opacity:0.8;">Courier Partner</p>
              <p style="margin:0;font-size:16px;font-weight:600;">${order.courierCompany}</p>
            </div>
            ${order.trackingUrl ? `<a href="${order.trackingUrl}" style="background:#fff;color:#764ba2;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Track Order →</a>` : ''}
          </div>
          ` : ''}
        </div>
        <div style="text-align:center;margin-top:16px;">
          <a href="${process.env.FRONTEND_URL || 'https://bhuvikastudio.com'}/track?orderId=${orderId}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Track Your Order on Website</a>
        </div>
        ` : ''}

        <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0 16px;" />
        <p style="color:#aaa;font-size:11px;text-align:center;margin:0;">
          Thank you for shopping with Bhuvika Studio!<br/>
          Questions? Reply to this email or visit bhuvikastudio.com
        </p>
      </div>
    `,
  };

  if (newStatus === 'CONFIRMED') {
    try {
      const pdfBase64 = await generateInvoicePdf(order);
      emailPayload.attachments = [
        {
          content: pdfBase64,
          filename: `invoice_${shortOrderId}.pdf`,
        }
      ];
    } catch (pdfErr) {
      console.error('Failed to generate or attach invoice PDF:', pdfErr);
    }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(emailPayload),
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
