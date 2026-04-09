import crypto from 'crypto';

export function generateSignature(data, secretKey) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(JSON.stringify(data))
    .digest('base64');
}

export function verifySignature(signature, data, secretKey) {
  const expectedSignature = generateSignature(data, secretKey);
  return signature === expectedSignature;
}

export async function createCashfreeOrder(orderData) {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const environment = process.env.CASHFREE_ENVIRONMENT || 'PRODUCTION';

  if (!clientId || !clientSecret) {
    throw new Error('Cashfree credentials not configured');
  }

  const url = environment === 'SANDBOX'
    ? 'https://sandbox.cashfree.com/pg/orders'
    : 'https://api.cashfree.com/pg/orders';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': '2022-09-01',
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create Cashfree order');
  }

  return await response.json();
}

export async function getCashfreeOrderStatus(orderId) {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const environment = process.env.CASHFREE_ENVIRONMENT || 'PRODUCTION';

  if (!clientId || !clientSecret) {
    throw new Error('Cashfree credentials not configured');
  }

  const url = environment === 'SANDBOX'
    ? `https://sandbox.cashfree.com/pg/orders/${orderId}`
    : `https://api.cashfree.com/pg/orders/${orderId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': '2022-09-01',
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch Cashfree order status');
  }

  return await response.json();
}
