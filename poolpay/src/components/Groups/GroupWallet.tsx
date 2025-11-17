import { useState } from 'react';
import { Wallet, Plus, Calculator, TrendingUp, CreditCard, Users } from 'lucide-react';
import { ExpenseTracker } from '../Expenses/ExpenseTracker';
import { MerchantPayment } from '../Payments/MerchantPayment';
import { PaymentRequestsList } from '../Payments/PaymentRequestsList';
import { SendUPIRequests } from '../Payments/SendUPIRequests';
import { SettlementSystem } from '../Expenses/SettlementSystem';
import { PaymentModeSelector } from './PaymentModeSelector';
import { PaymentModeInfo } from './PaymentModeInfo';
import { MemberManagement } from './MemberManagement';
import { P2PTransactionDashboard } from '../Transactions/P2PTransactionDashboard';
import { getEscrowBalance } from '../../services/escrowService';
import { useAuth } from '../../contexts/AuthContext';

interface GroupWalletProps {
  group: any;
  onRefresh: () => void;
}

export function GroupWallet({ group, onRefresh }: GroupWalletProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'balance' | 'expenses' | 'settlements' | 'pay' | 'requests' | 'members'>('balance');
  const [paymentMode, setPaymentMode] = useState<'p2p' | 'escrow'>(group.paymentMode || 'p2p');
  const [escrowBalance, setEscrowBalance] = useState(0);

  const loadEscrowBalance = async () => {
    if (paymentMode === 'escrow') {
      const balance = await getEscrowBalance(group.id);
      setEscrowBalance(balance);
    }
  };

  const handleModeChange = (mode: 'p2p' | 'escrow') => {
    setPaymentMode(mode);
    // Update group payment mode in Firebase
    // updateDoc(doc(db, 'groups', group.id), { paymentMode: mode });
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold">Group Wallet</h2>
              <p className="text-gray-600">{group.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{paymentMode === 'escrow' ? 'Escrow Balance' : 'Total Pooled'}</p>
            <p className="text-3xl font-bold text-green-600">₹{(paymentMode === 'escrow' ? escrowBalance : group.totalPooled || 0).toFixed(2)}</p>
            {paymentMode === 'escrow' && (
              <p className="text-xs text-blue-600">🔒 Secured in Escrow</p>
            )}
            {paymentMode === 'p2p' && (
              <p className="text-xs text-green-600">⚡ Direct P2P Mode</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex border-b overflow-x-auto">
        <button
          onClick={() => setActiveTab('balance')}
          className={`flex-1 py-3 px-4 text-center whitespace-nowrap ${activeTab === 'balance' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
        >
          <Wallet className="w-4 h-4 mx-auto mb-1" />
          Balance
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-3 px-4 text-center whitespace-nowrap ${activeTab === 'expenses' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
        >
          <Plus className="w-4 h-4 mx-auto mb-1" />
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`flex-1 py-3 px-4 text-center whitespace-nowrap ${activeTab === 'settlements' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
        >
          <Calculator className="w-4 h-4 mx-auto mb-1" />
          Settlements
        </button>
        <button
          onClick={() => setActiveTab('pay')}
          className={`flex-1 py-3 px-4 text-center whitespace-nowrap ${activeTab === 'pay' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
        >
          <CreditCard className="w-4 h-4 mx-auto mb-1" />
          Pay Merchant
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 px-4 text-center whitespace-nowrap ${activeTab === 'requests' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
        >
          <TrendingUp className="w-4 h-4 mx-auto mb-1" />
          Requests
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-3 px-4 text-center whitespace-nowrap ${activeTab === 'members' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
        >
          <Users className="w-4 h-4 mx-auto mb-1" />
          Members
        </button>
      </div>

      <div className="p-6">
        <PaymentModeInfo />
        <PaymentModeSelector 
          currentMode={paymentMode} 
          onModeChange={handleModeChange} 
        />
        
        {activeTab === 'balance' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Member Contributions</h3>
              {group.members?.map((member: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{member.name}</span>
                    <p className="text-sm text-gray-500">{member.upiId}</p>
                  </div>
                  <span className="font-medium">₹{(member.contributed || 0).toFixed(2)}</span>
                </div>
              )) || <p className="text-gray-500">No members added yet</p>}
            </div>
            
            {paymentMode === 'p2p' && (
              <P2PTransactionDashboard groupId={group.id} />
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <ExpenseTracker groupId={group.id} members={group.members || []} />
        )}

        {activeTab === 'settlements' && (
          <SettlementSystem groupId={group.id} members={group.members || []} />
        )}

        {activeTab === 'pay' && (
          <MerchantPayment
            groupId={group.id}
            availableBalance={paymentMode === 'escrow' ? escrowBalance : group.totalPooled || 0}
            paymentMode={paymentMode}
            onPaymentComplete={onRefresh}
          />
        )}

        {activeTab === 'requests' && (
          <div className="space-y-6">
            <SendUPIRequests 
              groupId={group.id} 
              members={group.members || []} 
              paymentMode={paymentMode}
              onRequestsSent={() => {}}
            />
            <PaymentRequestsList groupId={group.id} />
          </div>
        )}

        {activeTab === 'members' && (
          <MemberManagement
            groupId={group.id}
            members={group.members || []}
            isAdmin={group.created_by === user?.uid || group.createdBy === user?.uid}
            onMembersUpdated={onRefresh}
          />
        )}
      </div>
    </div>
  );
}