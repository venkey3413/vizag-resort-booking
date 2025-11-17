import { useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Member {
  id: string;
  display_name: string;
  upi_id: string;
}

interface SendPaymentRequestProps {
  groupId: string;
  members: Member[];
  onRequestSent: () => void;
}

export function SendPaymentRequest({ groupId, members, onRequestSent }: SendPaymentRequestProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map((m) => m.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selectedMembers.length === 0) {
      setError('Please select at least one member');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const requests = selectedMembers.map((memberId) => ({
        group_id: groupId,
        member_id: memberId,
        amount: amountNum,
        status: 'pending' as const,
      }));

      const { error: insertError } = await supabase
        .from('payment_requests')
        .insert(requests);

      if (insertError) throw insertError;

      setSuccess(`Payment requests sent to ${selectedMembers.length} member(s)`);
      setSelectedMembers([]);
      setAmount('');
      onRequestSent();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send requests');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 p-6 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Send className="w-5 h-5 text-blue-600" />
        Send Payment Requests
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            Amount per member (₹)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter amount"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Members
            </label>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {selectedMembers.length === members.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {members.map((member) => (
              <label
                key={member.id}
                className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(member.id)}
                  onChange={() => handleToggleMember(member.id)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{member.display_name}</p>
                  <p className="text-sm text-gray-600">{member.upi_id}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          {loading ? 'Sending...' : `Send Requests to ${selectedMembers.length} Member(s)`}
        </button>
      </form>
    </div>
  );
}
