import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Transaction {
  id: string;
  type: 'pool_in' | 'payment_out' | 'refund';
  amount: number;
  description: string;
  merchant_name: string | null;
  created_at: string;
  member: {
    display_name: string;
  };
}

interface TransactionHistoryProps {
  groupId: string;
}

export function TransactionHistory({ groupId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [groupId]);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          member:group_members(display_name)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((tx) => ({
        ...tx,
        member: Array.isArray(tx.member) ? tx.member[0] : tx.member,
      })) || [];

      setTransactions(formattedData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading transactions...</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
          <RefreshCw className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-600">No transactions yet</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'pool_in':
        return <ArrowDownCircle className="w-5 h-5 text-green-600" />;
      case 'payment_out':
        return <ArrowUpCircle className="w-5 h-5 text-red-600" />;
      case 'refund':
        return <RefreshCw className="w-5 h-5 text-blue-600" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'pool_in':
        return 'Money Added';
      case 'payment_out':
        return 'Payment Made';
      case 'refund':
        return 'Refund';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Transaction History</h3>
      <div className="space-y-2">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="mt-1">{getIcon(tx.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{getTypeLabel(tx.type)}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{tx.description}</p>
                  {tx.merchant_name && (
                    <p className="text-xs text-gray-500 mt-1">
                      Merchant: {tx.merchant_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    By {tx.member.display_name} • {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-bold ${
                      tx.type === 'pool_in' || tx.type === 'refund'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {tx.type === 'pool_in' || tx.type === 'refund' ? '+' : '-'}₹
                    {tx.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
