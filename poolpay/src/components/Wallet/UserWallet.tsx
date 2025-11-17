import { useState, useEffect } from 'react';
import { Wallet, Plus, Send, History, Copy, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getWalletBalance, getWalletTransactions, transferMoney, getUserVirtualAccount, initializeUserWallet, WalletTransaction } from '../../services/walletService';

export function UserWallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'balance' | 'send' | 'history'>('balance');
  
  // Send money form
  const [recipientUPI, setRecipientUPI] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [description, setDescription] = useState('');
  
  // Add money
  const [paymentLink, setPaymentLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [virtualAccount, setVirtualAccount] = useState<any>(null);
  const [walletInitialized, setWalletInitialized] = useState(false);

  useEffect(() => {
    if (user) {
      loadWalletData();
      generatePaymentLink();
    }
  }, [user]);

  const loadWalletData = async () => {
    if (!user) return;
    
    try {
      // Try to get existing wallet
      const walletBalance = await getWalletBalance(user.uid);
      const walletTransactions = await getWalletTransactions(user.uid);
      
      setBalance(walletBalance);
      setTransactions(walletTransactions);
      
      // Get virtual account details
      try {
        const vAccount = await getUserVirtualAccount(user.uid);
        setVirtualAccount(vAccount);
        setWalletInitialized(true);
        generatePaymentLink(vAccount);
      } catch (error) {
        // Wallet not initialized
        setWalletInitialized(false);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const generatePaymentLink = (vAccount?: any) => {
    if (!user || !vAccount) return;
    
    // Generate bank transfer details for Razorpay virtual account
    const link = `Bank Transfer Details:\nAccount: ${vAccount.accountNumber}\nIFSC: ${vAccount.ifsc}\nName: ${vAccount.name}`;
    setPaymentLink(link);
  };
  
  const initializeWallet = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await initializeUserWallet(
        user.uid,
        user.displayName || user.email?.split('@')[0] || 'User',
        user.email || '',
        '9999999999' // You should get this from user profile
      );
      
      await loadWalletData();
      alert('Wallet initialized successfully!');
    } catch (error) {
      console.error('Error initializing wallet:', error);
      alert('Failed to initialize wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMoney = async () => {
    if (!user || !recipientUPI || !sendAmount) return;
    
    setLoading(true);
    try {
      // In real implementation, you'd find user by UPI ID
      // For now, using placeholder recipient ID
      await transferMoney(user.uid, 'recipient_user_id', parseFloat(sendAmount), description);
      
      alert('Money sent successfully!');
      setRecipientUPI('');
      setSendAmount('');
      setDescription('');
      loadWalletData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to send money');
    } finally {
      setLoading(false);
    }
  };

  const copyPaymentLink = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(paymentLink);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = paymentLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold">My Wallet</h2>
              <p className="text-gray-600">Personal PoolPay Balance</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Available Balance</p>
            <p className="text-3xl font-bold text-green-600">₹{balance.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('balance')}
          className={`flex-1 py-3 px-4 text-center ${activeTab === 'balance' ? 'bg-green-50 text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
        >
          <Wallet className="w-4 h-4 mx-auto mb-1" />
          Add Money
        </button>
        <button
          onClick={() => setActiveTab('send')}
          className={`flex-1 py-3 px-4 text-center ${activeTab === 'send' ? 'bg-green-50 text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
        >
          <Send className="w-4 h-4 mx-auto mb-1" />
          Send Money
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-4 text-center ${activeTab === 'history' ? 'bg-green-50 text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
        >
          <History className="w-4 h-4 mx-auto mb-1" />
          History
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'balance' && (
          <div className="space-y-4">
            <h3 className="font-semibold">Add Money to Wallet</h3>
            
            {!walletInitialized ? (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-700 mb-3">
                  Initialize your Razorpay X wallet to start using PoolPay:
                </p>
                <button
                  onClick={initializeWallet}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Initializing...' : 'Initialize Wallet'}
                </button>
              </div>
            ) : (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700 mb-3">
                  Transfer money to your Razorpay X virtual account:
                </p>
                <div className="bg-white p-3 rounded border">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">{paymentLink}</pre>
                </div>
                <button
                  onClick={copyPaymentLink}
                  className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Copy Details
                </button>
                <p className="text-xs text-green-600 mt-2">
                  Money will be automatically credited to your wallet via Razorpay X.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'send' && (
          <div className="space-y-4">
            <h3 className="font-semibold">Send Money</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient UPI ID
              </label>
              <input
                type="text"
                value={recipientUPI}
                onChange={(e) => setRecipientUPI(e.target.value)}
                placeholder="recipient@upi"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.00"
                max={balance}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <p className="text-sm text-gray-500 mt-1">Available: ₹{balance.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Payment for..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={handleSendMoney}
              disabled={loading || !recipientUPI || !sendAmount || parseFloat(sendAmount) > balance}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Sending...' : `Send ₹${sendAmount || '0'}`}
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="font-semibold">Transaction History</h3>
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-gray-500">
                        {transaction.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`font-semibold ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}