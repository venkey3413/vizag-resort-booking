// Mock Cashfree service for development/testing without API credentials
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

// Mock virtual account creation
export const createVirtualAccount = async (groupId: string, groupName: string): Promise<VirtualAccount> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    vAccountId: `group_${groupId}`,
    ifsc: 'CFPB0000001',
    accountNumber: `100${groupId.slice(-6)}`,
    upiId: `poolpay.${groupId}@cashfree`
  };
};

// Mock beneficiary addition
export const addBeneficiary = async (memberId: string, member: {
  name: string;
  email: string;
  phone: string;
  upiId: string;
}): Promise<Beneficiary> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    beneId: `member_${memberId}`,
    name: member.name,
    email: member.email,
    phone: member.phone,
    bankAccount: '000000000000',
    ifsc: 'PYTM0123456',
    vpa: member.upiId
  };
};

// Mock wallet balance (returns random amount for demo)
export const getWalletBalance = async (groupId: string): Promise<number> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return Math.floor(Math.random() * 10000); // Random balance for demo
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
    transferId,
    status: 'SUCCESS',
    utr: `UTR${Date.now()}`,
    message: 'Mock payout successful'
  };
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
  
  return {
    batchTransferId: `batch_${groupId}_${Date.now()}`,
    status: 'SUCCESS',
    transfers: payouts.map((payout, index) => ({
      transferId: `${groupId}_${Date.now()}_${index}`,
      status: 'SUCCESS',
      utr: `UTR${Date.now() + index}`
    }))
  };
};

// Mock transfer status
export const getTransferStatus = async (transferId: string): Promise<any> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return {
    transferId,
    status: 'SUCCESS',
    utr: `UTR${Date.now()}`,
    amount: '1000.00'
  };
};