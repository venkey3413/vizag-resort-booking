import axios from 'axios';

const CASHFREE_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://payout-api.cashfree.com' 
  : 'https://payout-gamma.cashfree.com';

const cashfreeAPI = axios.create({
  baseURL: CASHFREE_BASE_URL,
  headers: {
    'X-Client-Id': import.meta.env.VITE_CASHFREE_CLIENT_ID,
    'X-Client-Secret': import.meta.env.VITE_CASHFREE_CLIENT_SECRET,
    'Content-Type': 'application/json'
  }
});

export interface VirtualAccount {
  vAccountId: string;
  ifsc: string;
  accountNumber: string;
  upiId: string;
}

export interface Beneficiary {
  beneId: string;
  name: string;
  email: string;
  phone: string;
  bankAccount: string;
  ifsc: string;
  vpa?: string;
}

// Create virtual account for group escrow
export const createVirtualAccount = async (groupId: string, groupName: string): Promise<VirtualAccount> => {
  const response = await cashfreeAPI.post('/payout/v1/createVA', {
    vAccountId: `group_${groupId}`,
    name: groupName,
    phone: '9999999999', // Use app's registered phone
    email: 'support@poolpay.com'
  });
  return response.data;
};

// Add group member as beneficiary
export const addBeneficiary = async (memberId: string, member: {
  name: string;
  email: string;
  phone: string;
  upiId: string;
}): Promise<Beneficiary> => {
  const response = await cashfreeAPI.post('/payout/v1/addBeneficiary', {
    beneId: `member_${memberId}`,
    name: member.name,
    email: member.email,
    phone: member.phone,
    bankAccount: '000000000000', // Placeholder for UPI
    ifsc: 'PYTM0123456', // Paytm IFSC for UPI
    vpa: member.upiId
  });
  return response.data;
};

// Get wallet balance for group
export const getWalletBalance = async (groupId: string): Promise<number> => {
  const response = await cashfreeAPI.get(`/payout/v1/getBalance/${groupId}`);
  return response.data.balance || 0;
};

// Send payout to member
export const sendPayout = async (
  transferId: string,
  memberId: string,
  amount: number,
  remarks: string
): Promise<any> => {
  const response = await cashfreeAPI.post('/payout/v1/requestTransfer', {
    transferId,
    beneId: `member_${memberId}`,
    amount: amount.toString(),
    transferMode: 'upi',
    remarks
  });
  return response.data;
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
  const transfers = payouts.map((payout, index) => ({
    transferId: `${groupId}_${Date.now()}_${index}`,
    beneId: `member_${payout.memberId}`,
    amount: payout.amount.toString(),
    transferMode: 'upi',
    remarks: payout.remarks
  }));

  const response = await cashfreeAPI.post('/payout/v1/requestBatchTransfer', {
    batchTransferId: `batch_${groupId}_${Date.now()}`,
    batchFormat: 'BANK_ACCOUNT',
    deleteBene: 0,
    batch: transfers
  });
  return response.data;
};

// Get transfer status
export const getTransferStatus = async (transferId: string): Promise<any> => {
  const response = await cashfreeAPI.get(`/payout/v1/getTransferStatus?transferId=${transferId}`);
  return response.data;
};