// Mock Razorpay service for development/testing without API credentials
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

// Mock virtual account creation
export const createVirtualAccount = async (groupId: string, groupName: string): Promise<VirtualAccount> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    id: `va_${groupId}`,
    name: groupName,
    entity: 'virtual_account',
    status: 'active',
    description: `PoolPay Group: ${groupName}`,
    amount_expected: 0,
    amount_paid: Math.floor(Math.random() * 10000),
    customer_id: `group_${groupId}`,
    receivers: [{
      id: `ba_${groupId}`,
      entity: 'bank_account',
      ifsc: 'RAZR0000001',
      account_number: `100${groupId.slice(-6)}`,
      name: groupName
    }]
  };
};

// Mock payment link creation
export const createPaymentLink = async (
  amount: number,
  description: string,
  customerPhone: string,
  customerEmail: string,
  upiId?: string
): Promise<PaymentLink> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const linkId = `plink_${Date.now()}`;
  return {
    id: linkId,
    entity: 'payment_link',
    status: 'created',
    amount: amount * 100,
    currency: 'INR',
    description,
    short_url: `https://rzp.io/${linkId}`,
    upi_link: `upi://pay?pa=poolpay@razorpay&pn=PoolPay&am=${amount}&tn=${encodeURIComponent(description)}&mode=02`
  };
};

// Mock payout
export const sendPayout = async (
  transferId: string,
  memberId: string,
  amount: number,
  remarks: string
): Promise<any> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    id: transferId,
    entity: 'payout',
    fund_account_id: `member_${memberId}`,
    amount: amount * 100,
    currency: 'INR',
    status: 'processed',
    utr: `UTR${Date.now()}`,
    mode: 'UPI'
  };
};

// Mock payment link status
export const getPaymentLinkStatus = async (paymentLinkId: string): Promise<any> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    id: paymentLinkId,
    status: 'paid',
    amount_paid: Math.floor(Math.random() * 5000) * 100
  };
};

// Mock wallet balance
export const getWalletBalance = async (virtualAccountId: string): Promise<number> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return Math.floor(Math.random() * 10000);
};

// Mock bulk payout
export const bulkPayout = async (
  groupId: string,
  payouts: Array<{
    memberId: string;
    amount: number;
    remarks: string;
  }>
): Promise<any> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return payouts.map((payout, index) => ({
    id: `${groupId}_${Date.now()}_${index}`,
    status: 'processed',
    utr: `UTR${Date.now() + index}`,
    amount: payout.amount * 100
  }));
};