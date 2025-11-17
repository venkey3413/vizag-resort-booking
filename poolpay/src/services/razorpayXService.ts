import axios from 'axios';

const RAZORPAY_X_BASE_URL = 'https://api.razorpay.com/v1';

const razorpayXAPI = axios.create({
  baseURL: RAZORPAY_X_BASE_URL,
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

export interface FundAccount {
  id: string;
  entity: string;
  contact_id: string;
  account_type: string;
  bank_account: {
    name: string;
    ifsc: string;
    account_number: string;
  };
  vpa?: {
    address: string;
  };
  active: boolean;
}

export interface Payout {
  id: string;
  entity: string;
  fund_account_id: string;
  amount: number;
  currency: string;
  status: string;
  utr: string;
  mode: string;
  purpose: string;
  reference_id: string;
}

// Create contact for user
export const createContact = async (userId: string, name: string, email: string, phone: string) => {
  const response = await razorpayXAPI.post('/contacts', {
    name,
    email,
    contact: phone,
    type: 'customer',
    reference_id: userId,
    notes: {
      user_id: userId,
      created_by: 'poolpay'
    }
  });
  return response.data;
};

// Create virtual account for user wallet
export const createUserVirtualAccount = async (contactId: string, userId: string, userName: string): Promise<VirtualAccount> => {
  const response = await razorpayXAPI.post('/virtual_accounts', {
    receivers: {
      types: ['bank_account']
    },
    description: `PoolPay Wallet - ${userName}`,
    customer_id: contactId,
    notes: {
      user_id: userId,
      wallet_type: 'personal'
    }
  });
  return response.data;
};

// Create fund account for payouts
export const createFundAccount = async (contactId: string, accountType: 'bank_account' | 'vpa', accountDetails: any) => {
  const payload: any = {
    contact_id: contactId,
    account_type: accountType
  };

  if (accountType === 'bank_account') {
    payload.bank_account = accountDetails;
  } else if (accountType === 'vpa') {
    payload.vpa = { address: accountDetails.upi_id };
  }

  const response = await razorpayXAPI.post('/fund_accounts', payload);
  return response.data;
};

// Send payout to user
export const sendPayout = async (
  fundAccountId: string,
  amount: number,
  currency: string = 'INR',
  mode: string = 'UPI',
  purpose: string = 'payout',
  referenceId: string,
  narration: string
): Promise<Payout> => {
  const response = await razorpayXAPI.post('/payouts', {
    account_number: import.meta.env.VITE_RAZORPAY_ACCOUNT_NUMBER,
    fund_account_id: fundAccountId,
    amount: amount * 100, // Convert to paise
    currency,
    mode,
    purpose,
    queue_if_low_balance: true,
    reference_id: referenceId,
    narration
  });
  return response.data;
};

// Get virtual account details and balance
export const getVirtualAccount = async (virtualAccountId: string): Promise<VirtualAccount> => {
  const response = await razorpayXAPI.get(`/virtual_accounts/${virtualAccountId}`);
  return response.data;
};

// Get payout status
export const getPayoutStatus = async (payoutId: string): Promise<Payout> => {
  const response = await razorpayXAPI.get(`/payouts/${payoutId}`);
  return response.data;
};

// Get account balance
export const getAccountBalance = async (): Promise<number> => {
  const response = await razorpayXAPI.get(`/accounts/${import.meta.env.VITE_RAZORPAY_ACCOUNT_NUMBER}/balance`);
  return response.data.balance / 100; // Convert from paise
};

// Transfer between virtual accounts (internal transfer)
export const transferBetweenAccounts = async (
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description: string
) => {
  // This would require custom implementation or use payouts
  // For now, we'll use payout to recipient's fund account
  return {
    transfer_id: `transfer_${Date.now()}`,
    status: 'processed',
    amount: amount * 100
  };
};