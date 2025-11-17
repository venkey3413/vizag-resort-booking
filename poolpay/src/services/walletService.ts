import { doc, updateDoc, getDoc, setDoc, increment, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Use mock service for development, real service for production
const USE_MOCK_SERVICE = !import.meta.env.VITE_RAZORPAY_KEY_ID;

const getRazorpayXService = async () => {
  if (USE_MOCK_SERVICE) {
    return await import('./mockRazorpayXService');
  } else {
    return await import('./razorpayXService');
  }
};

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  fromUserId?: string;
  toUserId?: string;
  utr?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

// Initialize user wallet with Razorpay X virtual account
export const initializeUserWallet = async (userId: string, userName: string, email: string, phone: string) => {
  try {
    const service = await getRazorpayXService();
    
    // Create contact
    const contact = await service.createContact(userId, userName, email, phone);
    
    // Create virtual account
    const virtualAccount = await service.createUserVirtualAccount(contact.id, userId, userName);
    
    // Save to Firebase
    await setDoc(doc(db, 'wallets', userId), {
      contactId: contact.id,
      virtualAccountId: virtualAccount.id,
      accountNumber: virtualAccount.receivers[0].account_number,
      ifsc: virtualAccount.receivers[0].ifsc,
      balance: virtualAccount.amount_paid / 100, // Convert from paise
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return virtualAccount;
  } catch (error) {
    console.error('Error initializing wallet:', error);
    throw error;
  }
};

// Get user's wallet balance from Razorpay X
export const getWalletBalance = async (userId: string): Promise<number> => {
  try {
    const walletDoc = await getDoc(doc(db, 'wallets', userId));
    
    if (!walletDoc.exists()) {
      return 0;
    }
    
    const walletData = walletDoc.data();
    const service = await getRazorpayXService();
    
    // Get real-time balance from Razorpay X
    const virtualAccount = await service.getVirtualAccount(walletData.virtualAccountId);
    const currentBalance = virtualAccount.amount_paid / 100; // Convert from paise
    
    // Update local balance
    await updateDoc(doc(db, 'wallets', userId), {
      balance: currentBalance,
      updatedAt: new Date()
    });
    
    return currentBalance;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return 0;
  }
};

// Get user's virtual account details
export const getUserVirtualAccount = async (userId: string) => {
  try {
    const walletDoc = await getDoc(doc(db, 'wallets', userId));
    
    if (!walletDoc.exists()) {
      throw new Error('Wallet not found. Please initialize wallet first.');
    }
    
    const walletData = walletDoc.data();
    const service = await getRazorpayXService();
    
    const virtualAccount = await service.getVirtualAccount(walletData.virtualAccountId);
    
    return {
      accountNumber: virtualAccount.receivers[0].account_number,
      ifsc: virtualAccount.receivers[0].ifsc,
      name: virtualAccount.receivers[0].name,
      balance: virtualAccount.amount_paid / 100
    };
  } catch (error) {
    console.error('Error getting virtual account:', error);
    throw error;
  }
};

// Transfer money between users using Razorpay X payouts
export const transferMoney = async (fromUserId: string, toUserId: string, amount: number, description: string) => {
  try {
    // Get sender and receiver wallet details
    const [senderWallet, receiverWallet] = await Promise.all([
      getDoc(doc(db, 'wallets', fromUserId)),
      getDoc(doc(db, 'wallets', toUserId))
    ]);
    
    if (!senderWallet.exists() || !receiverWallet.exists()) {
      throw new Error('Wallet not found');
    }
    
    // Check sender balance
    const senderBalance = await getWalletBalance(fromUserId);
    if (senderBalance < amount) {
      throw new Error('Insufficient balance');
    }
    
    const service = await getRazorpayXService();
    const receiverData = receiverWallet.data();
    
    // Create fund account for receiver if not exists
    // This would typically be done during wallet setup
    
    // Send payout to receiver
    const payout = await service.sendPayout(
      receiverData.fundAccountId || 'fa_mock', // Fund account ID
      amount,
      'INR',
      'UPI',
      'payout',
      `transfer_${Date.now()}`,
      description
    );
    
    // Record transactions
    const transactionData = {
      fromUserId,
      toUserId,
      amount,
      description,
      payoutId: payout.id,
      utr: payout.utr,
      status: 'completed',
      createdAt: new Date()
    };

    // Debit transaction for sender
    await addDoc(collection(db, 'walletTransactions'), {
      ...transactionData,
      userId: fromUserId,
      type: 'debit'
    });

    // Credit transaction for receiver
    await addDoc(collection(db, 'walletTransactions'), {
      ...transactionData,
      userId: toUserId,
      type: 'credit'
    });

    return payout;
  } catch (error) {
    console.error('Error transferring money:', error);
    throw error;
  }
};

// Get user's transaction history
export const getWalletTransactions = async (userId: string): Promise<WalletTransaction[]> => {
  try {
    const q = query(
      collection(db, 'walletTransactions'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const transactions: WalletTransaction[] = [];
    
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() } as WalletTransaction);
    });
    
    return transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
};

// Pay from wallet to group (for group expenses)
export const payToGroup = async (userId: string, groupId: string, amount: number, description: string) => {
  try {
    const userBalance = await getWalletBalance(userId);
    if (userBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Debit from user wallet
    await setDoc(doc(db, 'wallets', userId), {
      balance: increment(-amount),
      updatedAt: new Date()
    }, { merge: true });

    // Add to group pool
    await setDoc(doc(db, 'groups', groupId), {
      totalPooled: increment(amount),
      updatedAt: new Date()
    }, { merge: true });

    // Record transaction
    await addDoc(collection(db, 'walletTransactions'), {
      userId,
      type: 'debit',
      amount,
      description: `Paid to group: ${description}`,
      groupId,
      status: 'completed',
      createdAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error paying to group:', error);
    throw error;
  }
};