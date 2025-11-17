import { useState } from 'react';
import { Plus, Receipt, Camera } from 'lucide-react';
import { SplitCalculator } from './SplitCalculator';

interface Member {
  id: string;
  name: string;
  upiId: string;
}

interface AddExpenseProps {
  groupId: string;
  members: Member[];
  onExpenseAdded: () => void;
  onClose: () => void;
}

const categories = [
  { id: 'food', name: 'Food & Dining', icon: '🍽️' },
  { id: 'transport', name: 'Transport', icon: '🚗' },
  { id: 'accommodation', name: 'Hotels', icon: '🏨' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'other', name: 'Other', icon: '📝' }
];

export function AddExpense({ groupId, members, onExpenseAdded, onClose }: AddExpenseProps) {
  const [step, setStep] = useState<'details' | 'split'>('details');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [paidBy, setPaidBy] = useState(members[0]?.name || '');
  const [receipt, setReceipt] = useState<File | null>(null);

  const handleSplitCalculated = (splits: { memberId: string; amount: number }[]) => {
    console.log('Expense:', { description, amount, category, paidBy, splits });
    onExpenseAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Add Expense</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {step === 'details' && (
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dinner at restaurant"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Category
              </label>
              <div className="grid grid-cols-2 gap-3">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      category === cat.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="font-medium">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paid by
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {members.map(member => (
                  <option key={member.name} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Receipt (Optional)
              </label>
              <div className="flex gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                  className="hidden"
                  id="receipt-upload"
                />
                <label
                  htmlFor="receipt-upload"
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500"
                >
                  <Receipt className="w-5 h-5" />
                  Upload Receipt
                </label>
                <button className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500">
                  <Camera className="w-5 h-5" />
                  Take Photo
                </button>
              </div>
              {receipt && (
                <p className="text-sm text-green-600 mt-2">Receipt uploaded: {receipt.name}</p>
              )}
            </div>

            <button
              onClick={() => setStep('split')}
              disabled={!description || !amount}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
            >
              Next: Split Amount
            </button>
          </div>
        )}

        {step === 'split' && (
          <div className="p-6">
            <SplitCalculator
              members={members}
              totalAmount={parseFloat(amount)}
              onSplitCalculated={handleSplitCalculated}
            />
            <button
              onClick={() => setStep('details')}
              className="w-full mt-4 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
            >
              Back to Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}