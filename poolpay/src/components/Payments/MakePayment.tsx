import { useState } from 'react';
import { CreditCard, Plane, Hotel, Coffee, Car } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface MakePaymentProps {
  groupId: string;
  availableBalance: number;
  onPaymentMade: () => void;
}

const categories = [
  { value: 'flight', label: 'Flight', icon: Plane },
  { value: 'hotel', label: 'Hotel', icon: Hotel },
  { value: 'food', label: 'Food', icon: Coffee },
  { value: 'transport', label: 'Transport', icon: Car },
  { value: 'other', label: 'Other', icon: CreditCard },
];

export function MakePayment({ groupId, availableBalance, onPaymentMade }: MakePaymentProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum > availableBalance) {
      setError('Insufficient balance in group wallet');
      return;
    }

    setLoading(true);

    try {
      const { data: memberData } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user!.id)
        .single();

      if (!memberData) throw new Error('Member not found');

      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          group_id: groupId,
          member_id: memberData.id,
          type: 'payment_out',
          amount: amountNum,
          description,
          merchant_name: merchantName || null,
        })
        .select()
        .single();

      if (txError) throw txError;

      const { error: expenseError } = await supabase.from('group_expenses').insert({
        group_id: groupId,
        paid_by: user!.id,
        amount: amountNum,
        category,
        description,
        merchant_name: merchantName || null,
        transaction_id: transaction.id,
      });

      if (expenseError) throw expenseError;

      const { error: updateError } = await supabase
        .from('groups')
        .update({ total_pooled: availableBalance - amountNum })
        .eq('id', groupId);

      if (updateError) throw updateError;

      setSuccess('Payment made successfully!');
      setAmount('');
      setDescription('');
      setMerchantName('');
      setCategory('other');
      onPaymentMade();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 mb-6 text-white">
        <p className="text-sm opacity-90 mb-1">Available Balance</p>
        <p className="text-3xl font-bold">₹{availableBalance.toFixed(2)}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (₹)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Category
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {categories.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  category === value
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-medium">{label}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Merchant Name
          </label>
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., MakeMyTrip, Booking.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="What is this payment for?"
            rows={3}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          <CreditCard className="w-5 h-5" />
          {loading ? 'Processing...' : 'Make Payment'}
        </button>
      </form>
    </div>
  );
}
