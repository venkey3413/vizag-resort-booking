import { collection, addDoc, doc, updateDoc, query, where, onSnapshot, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PaymentRequest, Transaction } from '../types';
// Use mock service for development, real service for production
const USE_MOCK_SERVICE = !import.meta.env.VITE_RAZORPAY_KEY_ID;

const getRazorpayService = async () => {
  if (USE_MOCK_SERVICE) {
    return await import('./mockRazorpayService');
  } else {
    return await import('./razorpayService');
  }
};

export const createVirtualAccount = async (groupId: string, groupName: string) => {
  const service = await getRazorpayService();
  return service.createVirtualAccount(groupId, groupName);
};

export const createPaymentLink = async (amount: number, description: string, customerPhone: string, customerEmail: string, upiId?: string) => {
  const service = await getRazorpayService();
  return service.createPaymentLink(amount, description, customerPhone, customerEmail, upiId);
};

export const sendPayout = async (transferId: string, memberId: string, amount: number, remarks: string) => {
  const service = await getRazorpayService();
  return service.sendPayout(transferId, memberId, amount, remarks);
};

export const bulkPayout = async (groupId: string, payouts: any[]) => {
  const service = await getRazorpayService();
  return service.bulkPayout(groupId, payouts);
};

export const getWalletBalance = async (groupId: string) => {
  const service = await getRazorpayService();
  return service.getWalletBalance(groupId);
};

export const sendPaymentRequest = async (groupId: string, fromUserId: string, toUserId: string, amount: number) => {
  await addDoc(collection(db, 'paymentRequests'), {
    groupId,
    fromUserId,
    toUserId,
    amount,
    status: 'pending',
    requestedAt: new Date()
  });
};

export const acceptPaymentRequest = async (requestId: string) => {
  await updateDoc(doc(db, 'paymentRequests', requestId), {
    status: 'accepted',
    respondedAt: new Date()
  });
};

export const rejectPaymentRequest = async (requestId: string) => {
  await updateDoc(doc(db, 'paymentRequests', requestId), {
    status: 'rejected',
    respondedAt: new Date()
  });
};

export const getPaymentRequests = (userId: string, callback: (requests: PaymentRequest[]) => void) => {
  const q = query(collection(db, 'paymentRequests'), where('toUserId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PaymentRequest[];
    callback(requests);
  });
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
  await addDoc(collection(db, 'transactions'), {
    ...transaction,
    createdAt: new Date()
  });
};

export const payMerchant = async (groupId: string, merchantUpiId: string, amount: number, merchantName: string, paymentMode: 'p2p' | 'escrow' = 'escrow') => {
  const transferId = `merchant_${groupId}_${Date.now()}`;
  
  if (paymentMode === 'escrow') {
    // Send payout from escrow wallet
    await sendPayout(transferId, 'merchant', amount, `Payment to ${merchantName}`);
  }

  // Create payment transaction
  await addTransaction({
    groupId,
    userId: 'system',
    type: 'payment_out',
    amount,
    description: `Payment to ${merchantName}`,
    merchantName,
    upiTransactionId: transferId,
    paymentMode
  });

  if (paymentMode === 'escrow') {
    // Update group balance for escrow
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      totalPooled: increment(-amount)
    });
  }
};

export const processUPIPayment = (merchantId: string, amount: number, merchantName: string) => {
  // Check if it's phone number or UPI ID
  const isPhoneNumber = /^\d{10}$/.test(merchantId);
  const payeeAddress = isPhoneNumber ? `${merchantId}@paytm` : merchantId;
  
  // Generate UPI payment URL
  const upiUrl = `upi://pay?pa=${payeeAddress}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR`;
  
  // Open UPI app
  if (navigator.userAgent.match(/Android/i)) {
    window.location.href = upiUrl;
  } else {
    window.open(upiUrl, '_blank');
  }
};

export const sendUPIRequest = async (groupId: string, memberUpiId: string, amount: number, description: string, paymentMode: 'p2p' | 'escrow' = 'p2p') => {
  let collectUrl;
  let requestData: any = {
    groupId,
    memberUpiId,
    amount,
    description,
    status: 'pending',
    requestedAt: new Date(),
    paymentMode
  };

  if (paymentMode === 'escrow') {
    // Create virtual account for group if not exists
    const vAccount = await createVirtualAccount(groupId, `Group ${groupId}`);
    collectUrl = `upi://pay?pa=${vAccount.upiId}&pn=PoolPay&am=${amount}&tn=${encodeURIComponent(description)}&mode=02`;
    requestData.virtualAccountId = vAccount.vAccountId;
  } else {
    // P2P mode - direct payment
    collectUrl = `upi://pay?pa=${memberUpiId}&pn=PoolPay&am=${amount}&tn=${encodeURIComponent(description)}&mode=02`;
  }
  
  // Store request in Firebase
  await addDoc(collection(db, 'paymentRequests'), requestData);
  
  return collectUrl;
};