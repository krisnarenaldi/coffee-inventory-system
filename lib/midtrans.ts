import { CoreApi, Snap } from 'midtrans-client';

// Initialize Midtrans Core API
const serverKey = process.env.MIDTRANS_SERVER_KEY!;
const clientKey = process.env.MIDTRANS_CLIENT_KEY!;

// Determine environment:
// Priority 1: explicit flag MIDTRANS_IS_PRODUCTION === 'true'
// Fallback: infer from key prefixes (Sandbox keys usually start with 'SB-')
const inferredIsProd = serverKey ? !serverKey.startsWith('SB-') : false;
const isProduction = process.env.MIDTRANS_IS_PRODUCTION
  ? process.env.MIDTRANS_IS_PRODUCTION === 'true'
  : inferredIsProd;

const coreApi = new CoreApi({
  isProduction,
  serverKey,
  clientKey,
});

// Initialize Midtrans Snap
const snap = new Snap({
  isProduction,
  serverKey,
  clientKey,
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
    console.log('🔍 MIDTRANS DEBUG: Creating transaction with parameter:', {
      order_id: parameter.transaction_details.order_id,
      gross_amount: parameter.transaction_details.gross_amount,
      customer_email: parameter.customer_details.email,
      isProduction,
      serverKeyPrefix: serverKey?.substring(0, 10) + '...'
    });
    
    const transaction = await snap.createTransaction(parameter);
    
    console.log('🔍 MIDTRANS DEBUG: Transaction created successfully:', {
      hasToken: !!transaction.token,
      tokenLength: transaction.token?.length
    });
    
    return transaction.token;
  } catch (error) {
    console.error('🔍 MIDTRANS DEBUG: Error creating Snap token:', error);
    console.error('🔍 MIDTRANS DEBUG: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to create payment token');
  }
}

/**
 * Get transaction status from Midtrans
 */
export async function getTransactionStatus(orderId: string) {
  try {
    // Use direct HTTP request since TypeScript definitions are incomplete
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const auth = Buffer.from(serverKey + ':').toString('base64');
    const baseUrl = isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
    
    const response = await fetch(`${baseUrl}/v2/${orderId}/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting transaction status:', error);
    throw error;
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