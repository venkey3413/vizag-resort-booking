// Mock Razorpay X service for development without API credentials
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
  bank_account?: {
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

// Mock contact creation
export const createContact = async (userId: string, name: string, email: string, phone: string) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    id: `cont_${userId}`,
    entity: 'contact',
    name,
    contact: phone,
    email,
    type: 'customer',
    reference_id: userId,
    active: true
  };
};

// Mock virtual account creation
export const createUserVirtualAccount = async (contactId: string, userId: string, userName: string): Promise<VirtualAccount> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    id: `va_${userId}`,
    name: userName,
    entity: 'virtual_account',
    status: 'active',
    description: `PoolPay Wallet - ${userName}`,
    amount_expected: 0,
    amount_paid: Math.floor(Math.random() * 5000) * 100, // Random balance in paise
    customer_id: contactId,
    receivers: [{
      id: `ba_${userId}`,
      entity: 'bank_account',
      ifsc: 'RAZR0000001',
      account_number: `2323${userId.slice(-6)}`,
      name: userName
    }]
  };
};

// Mock fund account creation
export const createFundAccount = async (contactId: string, accountType: 'bank_account' | 'vpa', accountDetails: any): Promise<FundAccount> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const fundAccount: FundAccount = {
    id: `fa_${Date.now()}`,
    entity: 'fund_account',
    contact_id: contactId,
    account_type: accountType,
    active: true
  };

  if (accountType === 'bank_account') {
    fundAccount.bank_account = accountDetails;
  } else if (accountType === 'vpa') {
    fundAccount.vpa = { address: accountDetails.upi_id };
  }

  return fundAccount;
};

// Mock payout
export const sendPayout = async (
  fundAccountId: string,
  amount: number,
  currency: string = 'INR',
  mode: string = 'UPI',
  purpose: string = 'payout',
  referenceId: string,
  narration: string
): Promise<Payout> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    id: `pout_${Date.now()}`,
    entity: 'payout',
    fund_account_id: fundAccountId,
    amount: amount * 100,
    currency,
    status: 'processed',
    utr: `UTR${Date.now()}`,
    mode,
    purpose,
    reference_id: referenceId
  };
};

// Mock virtual account details
export const getVirtualAccount = async (virtualAccountId: string): Promise<VirtualAccount> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    id: virtualAccountId,
    name: 'Mock User',
    entity: 'virtual_account',
    status: 'active',
    description: 'PoolPay Wallet - Mock User',
    amount_expected: 0,
    amount_paid: Math.floor(Math.random() * 10000) * 100,
    customer_id: 'cont_mock',
    receivers: [{
      id: 'ba_mock',
      entity: 'bank_account',
      ifsc: 'RAZR0000001',
      account_number: '2323230001',
      name: 'Mock User'
    }]
  };
};

// Mock payout status
export const getPayoutStatus = async (payoutId: string): Promise<Payout> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return {
    id: payoutId,
    entity: 'payout',
    fund_account_id: 'fa_mock',
    amount: 100000, // ₹1000 in paise
    currency: 'INR',
    status: 'processed',
    utr: `UTR${Date.now()}`,
    mode: 'UPI',
    purpose: 'payout',
    reference_id: 'ref_mock'
  };
};

// Mock account balance
export const getAccountBalance = async (): Promise<number> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return Math.floor(Math.random() * 100000); // Random balance
};

// Mock transfer between accounts
export const transferBetweenAccounts = async (
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description: string
) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    transfer_id: `transfer_${Date.now()}`,
    status: 'processed',
    amount: amount * 100
  };
};