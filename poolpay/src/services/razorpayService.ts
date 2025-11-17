import axios from 'axios';

const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1';

const razorpayAPI = axios.create({
  baseURL: RAZORPAY_BASE_URL,
  auth: {
    username: import.meta.env.VITE_RAZORPAY_KEY_ID,
    password: import.meta.env.VITE_RAZORPAY_KEY_SECRET
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface VirtualAccount {
  id: string;
  name: string;
  entity: string;
  status: string;
  description: string;
  amount_expected: number;
  amount_paid: number;
  customer_id: string;
  receivers: Array<{
    id: string;
    entity: string;
    ifsc: string;
    account_number: string;
    name: string;
  }>;
}

export interface PaymentLink {
  id: string;
  entity: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  short_url: string;
  upi_link: string;
}

// Create virtual account for group escrow
export const createVirtualAccount = async (groupId: string, groupName: string): Promise<VirtualAccount> => {
  const response = await razorpayAPI.post('/virtual_accounts', {
    receivers: {
      types: ['bank_account']
    },
    description: `PoolPay Group: ${groupName}`,
    customer_id: `group_${groupId}`,
    notes: {
      group_id: groupId,
      group_name: groupName
    }
  });
  return response.data;
};

// Create payment link for UPI collect
export const createPaymentLink = async (
  amount: number,
  description: string,
  customerPhone: string,
  customerEmail: string,
  upiId?: string
): Promise<PaymentLink> => {
  const response = await razorpayAPI.post('/payment_links', {
    amount: amount * 100, // Convert to paise
    currency: 'INR',
    description,
    customer: {
      contact: customerPhone,
      email: customerEmail
    },
    notify: {
      sms: true,
      email: true
    },
    upi_link: true,
    notes: {
      upi_id: upiId || ''
    }
  });
  return response.data;
};

// Send payout to member
export const sendPayout = async (
  transferId: string,
  memberId: string,
  amount: number,
  remarks: string
): Promise<any> => {
  const response = await razorpayAPI.post('/payouts', {
    account_number: import.meta.env.VITE_RAZORPAY_ACCOUNT_NUMBER,
    fund_account_id: `member_${memberId}`,
    amount: amount * 100, // Convert to paise
    currency: 'INR',
    mode: 'UPI',
    purpose: 'payout',
    queue_if_low_balance: true,
    reference_id: transferId,
    narration: remarks
  });
  return response.data;
};

// Get payment link status
export const getPaymentLinkStatus = async (paymentLinkId: string): Promise<any> => {
  const response = await razorpayAPI.get(`/payment_links/${paymentLinkId}`);
  return response.data;
};

// Get virtual account balance
export const getWalletBalance = async (virtualAccountId: string): Promise<number> => {
  const response = await razorpayAPI.get(`/virtual_accounts/${virtualAccountId}`);
  return response.data.amount_paid / 100; // Convert from paise
};

// Bulk payout to multiple members
export const bulkPayout = async (
  groupId: string,
  payouts: Array<{
    memberId: string;
    amount: number;
    remarks: string;
  }>
): Promise<any> => {
  const payoutPromises = payouts.map((payout, index) => 
    sendPayout(`${groupId}_${Date.now()}_${index}`, payout.memberId, payout.amount, payout.remarks)
  );
  
  return Promise.all(payoutPromises);
};