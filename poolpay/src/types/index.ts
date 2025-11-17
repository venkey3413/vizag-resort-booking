export interface Group {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  totalPooled: number;
  status: 'active' | 'closed';
  createdAt: Date;
  members: GroupMember[];
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  upiId: string;
  displayName: string;
  role: 'admin' | 'member';
  contributedAmount: number;
  joinedAt: Date;
}

export interface PaymentRequest {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  requestedAt: Date;
  respondedAt?: Date;
}

export interface Transaction {
  id: string;
  groupId: string;
  userId: string;
  type: 'pool_in' | 'payment_out' | 'refund';
  amount: number;
  description: string;
  merchantName?: string;
  upiTransactionId?: string;
  createdAt: Date;
}