import { CoreApi, Snap } from 'midtrans-client';

// Initialize Midtrans Core API
const coreApi = new CoreApi({
  isProduction: process.env.NODE_ENV === 'production',
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

// Initialize Midtrans Snap
const snap = new Snap({
  isProduction: process.env.NODE_ENV === 'production',
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

export interface MidtransTransactionDetails {
  order_id: string;
  gross_amount: number;
}

export interface MidtransCustomerDetails {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
}

export interface MidtransItemDetails {
  id: string;
  price: number;
  quantity: number;
  name: string;
  category?: string;
}

export interface MidtransParameter {
  transaction_details: MidtransTransactionDetails;
  customer_details: MidtransCustomerDetails;
  item_details: MidtransItemDetails[];
  credit_card?: {
    secure: boolean;
  };
  callbacks?: {
    finish: string;
    error: string;
    pending: string;
  };
  expiry?: {
    start_time: string;
    unit: 'second' | 'minute' | 'hour' | 'day';
    duration: number;
  };
  custom_field1?: string;
  custom_field2?: string;
  custom_field3?: string;
}

export interface MidtransNotification {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  masked_card?: string;
  gross_amount: string;
  fraud_status: string;
  eci?: string;
  currency: string;
  channel_response_message?: string;
  channel_response_code?: string;
  card_type?: string;
  bank?: string;
  approval_code?: string;
}

/**
 * Create a Snap payment token for checkout
 */
export async function createSnapToken(parameter: MidtransParameter): Promise<string> {
  try {
    const transaction = await snap.createTransaction(parameter);
    return transaction.token;
  } catch (error) {
    console.error('Error creating Snap token:', error);
    throw new Error('Failed to create payment token');
  }
}

/**
 * Get transaction status from Midtrans
 */
export async function getTransactionStatus(orderId: string) {
  try {
    const statusResponse = await coreApi.transaction.status(orderId);
    return statusResponse;
  } catch (error) {
    console.error('Error getting transaction status:', error);
    throw new Error('Failed to get transaction status');
  }
}

/**
 * Verify notification signature from Midtrans webhook
 */
export function verifySignature(notification: MidtransNotification): boolean {
  const crypto = require('crypto');
  const serverKey = process.env.MIDTRANS_SERVER_KEY!;
  
  const signatureKey = notification.signature_key;
  const orderId = notification.order_id;
  const statusCode = notification.status_code;
  const grossAmount = notification.gross_amount;
  
  const input = orderId + statusCode + grossAmount + serverKey;
  const hash = crypto.createHash('sha512').update(input).digest('hex');
  
  return hash === signatureKey;
}

/**
 * Map Midtrans transaction status to our internal status
 */
export function mapTransactionStatus(midtransStatus: string): 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED' {
  switch (midtransStatus) {
    case 'capture':
    case 'settlement':
      return 'PAID';
    case 'pending':
      return 'PENDING';
    case 'deny':
    case 'cancel':
      return 'CANCELLED';
    case 'expire':
      return 'EXPIRED';
    case 'failure':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

/**
 * Generate unique order ID for transactions
 */
export function generateOrderId(prefix: string = 'ORDER'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Format price for Indonesian Rupiah (remove decimal places)
 */
export function formatPriceForMidtrans(price: number): number {
  return Math.round(price);
}

export { coreApi, snap };