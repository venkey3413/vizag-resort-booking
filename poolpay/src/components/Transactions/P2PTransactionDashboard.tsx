import { useState, useEffect } from 'react';
import { Plus, Minus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface P2PTransaction {
  id: string;
  type: 'received' | 'used';
  amount: number;
  description: string;
  fromMember?: string;
  forExpense?: string;
  createdAt: Date;
  groupId?: string;
}

interface P2PTransactionDashboardProps {
  groupId?: string;
}

export function P2PTransactionDashboard({ groupId }: P2PTransactionDashboardProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<P2PTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formType, setFormType] = useState<'received' | 'used'>('received');
  
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    description: '',
    fromMember: '',
    forExpense: ''
  });

  useEffect(() => {
    loadTransactions();
  }, [user, groupId]);

  const loadTransactions = async () => {
    if (!user) return;
    
    try {
      let q;
      if (groupId) {
        q = query(
          collection(db, 'p2p_transactions'),
          where('userId', '==', user.uid),
          where('groupId', '==', groupId),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'p2p_transactions'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      const txns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate()
      })) as P2PTransaction[];
      
      setTransactions(txns);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.description) {
      alert('Please fill required fields');
      return;
    }

    setLoading(true);
    try {
      const txnData = {
        userId: user?.uid,
        groupId: groupId || null,
        type: formType,
        amount: parseFloat(newTransaction.amount),
        description: newTransaction.description,
        fromMember: formType === 'received' ? newTransaction.fromMember : null,
        forExpense: formType === 'used' ? newTransaction.forExpense : null,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'p2p_transactions'), txnData);
      
      setNewTransaction({ amount: '', description: '', fromMember: '', forExpense: '' });
      setShowAddForm(false);
      loadTransactions();
      alert('Transaction added successfully!');
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  const totalReceived = transactions
    .filter(t => t.type === 'received')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalUsed = transactions
    .filter(t => t.type === 'used')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalReceived - totalUsed;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-600 rounded-lg">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800">P2P Transaction Dashboard</h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-white" />
            <span className="text-sm font-medium text-green-100">Total Received</span>
          </div>
          <p className="text-2xl font-bold text-white">₹{totalReceived.toFixed(2)}</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-400 to-green-500 p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-white" />
            <span className="text-sm font-medium text-green-100">Total Used</span>
          </div>
          <p className="text-2xl font-bold text-white">₹{totalUsed.toFixed(2)}</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-white" />
            <span className="text-sm font-medium text-green-100">Current Balance</span>
          </div>
          <p className="text-2xl font-bold text-white">₹{balance.toFixed(2)}</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-300 to-green-400 p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-green-800">Total Transactions</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{transactions.length}</p>
        </div>
      </div>

      {/* Add Transaction Form */}
      {showAddForm && (
        <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200 shadow-lg">
          <h4 className="font-semibold mb-4 text-green-800">Add New Transaction</h4>
          
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setFormType('received')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                formType === 'received' 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'bg-white text-green-600 border border-green-300 hover:bg-green-50'
              }`}
            >
              Money Received
            </button>
            <button
              onClick={() => setFormType('used')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                formType === 'used' 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'bg-white text-green-600 border border-green-300 hover:bg-green-50'
              }`}
            >
              Money Used
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              type="number"
              placeholder="Amount"
              value={newTransaction.amount}
              onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Description"
              value={newTransaction.description}
              onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {formType === 'received' && (
            <input
              type="text"
              placeholder="From Member (optional)"
              value={newTransaction.fromMember}
              onChange={(e) => setNewTransaction({ ...newTransaction, fromMember: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
            />
          )}
          
          {formType === 'used' && (
            <input
              type="text"
              placeholder="For Expense (optional)"
              value={newTransaction.forExpense}
              onChange={(e) => setNewTransaction({ ...newTransaction, forExpense: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
            />
          )}
          
          <div className="flex gap-3">
            <button
              onClick={handleAddTransaction}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium shadow-md transition-all"
            >
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-6 py-2 bg-white text-green-600 border border-green-300 rounded-lg hover:bg-green-50 font-medium transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div>
        <h4 className="font-medium mb-3">Transaction History</h4>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No transactions recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-green-100 hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    transaction.type === 'received' ? 'bg-green-100' : 'bg-green-50'
                  }`}>
                    {transaction.type === 'received' ? (
                      <Plus className="w-4 h-4 text-green-600" />
                    ) : (
                      <Minus className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{transaction.description}</p>
                    <div className="text-sm text-gray-500">
                      {transaction.fromMember && <span className="text-green-600">From: {transaction.fromMember} • </span>}
                      {transaction.forExpense && <span className="text-green-600">For: {transaction.forExpense} • </span>}
                      <span>{transaction.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <span className={`font-bold text-lg ${
                  transaction.type === 'received' ? 'text-green-600' : 'text-green-500'
                }`}>
                  {transaction.type === 'received' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}