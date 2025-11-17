import { doc, updateDoc, increment, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createVirtualAccount, bulkPayout, getWalletBalance } from './paymentService';

// Initialize escrow wallet for new group
export const initializeGroupEscrow = async (groupId: string, groupName: string, members: any[]) => {
  // Create virtual account
  const vAccount = await createVirtualAccount(groupId, groupName);
  
  // Members will be added via payment links instead of beneficiaries
  // Razorpay uses payment links for member payments
  
  // Update group with virtual account details
  await updateDoc(doc(db, 'groups', groupId), {
    virtualAccount: vAccount,
    escrowEnabled: true
  });
  
  return vAccount;
};

// Process settlement from escrow to members
export const processSettlement = async (groupId: string, settlements: Array<{
  memberId: string;
  amount: number;
  description: string;
}>) => {
  // Execute bulk payout
  const result = await bulkPayout(groupId, settlements);
  
  // Record transactions
  for (const settlement of settlements) {
    await addDoc(collection(db, 'transactions'), {
      groupId,
      userId: settlement.memberId,
      type: 'settlement',
      amount: settlement.amount,
      description: settlement.description,
      createdAt: new Date(),
      status: 'processing'
    });
  }
  
  return result;
};

// Get current escrow balance
export const getEscrowBalance = async (groupId: string): Promise<number> => {
  return await getWalletBalance(groupId);
};

// Handle payment confirmation webhook
export const handlePaymentWebhook = async (webhookData: any) => {
  const { vAccountId, amount, utr, status } = webhookData;
  
  if (status === 'SUCCESS') {
    // Extract groupId from vAccountId
    const groupId = vAccountId.replace('group_', '');
    
    // Update group balance
    await updateDoc(doc(db, 'groups', groupId), {
      totalPooled: increment(parseFloat(amount))
    });
    
    // Record transaction
    await addDoc(collection(db, 'transactions'), {
      groupId,
      userId: 'system',
      type: 'deposit',
      amount: parseFloat(amount),
      description: 'Deposit to group escrow',
      upiTransactionId: utr,
      createdAt: new Date(),
      status: 'completed'
    });
  }
};