import { useState } from 'react';
import { Plus, Filter, TrendingUp, Calendar } from 'lucide-react';
import { AddExpense } from './AddExpense';
import { SettlementSystem } from './SettlementSystem';

interface Member {
  id?: string;
  name: string;
  upiId: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paidBy: string;
  date: Date;
  splits: { memberId: string; amount: number }[];
}

interface ExpenseTrackerProps {
  groupId: string;
  members: Member[];
}

export function ExpenseTracker({ groupId, members }: ExpenseTrackerProps) {
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlements' | 'analytics'>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'food', name: 'Food & Dining', icon: '🍽️' },
    { id: 'transport', name: 'Transport', icon: '🚗' },
    { id: 'accommodation', name: 'Hotels', icon: '🏨' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️' },
    { id: 'other', name: 'Other', icon: '📝' }
  ];

  const getMemberName = (memberId: string) => {
    return members.find(m => m.name === memberId || m.id === memberId)?.name || 'Unknown';
  };

  const getCategoryIcon = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.icon || '📝';
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const filteredExpenses = filterCategory === 'all' 
    ? expenses 
    : expenses.filter(exp => exp.category === filterCategory);

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Expense Tracker</h2>
          <button
            onClick={() => setShowAddExpense(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-blue-600 font-medium">Total Expenses</p>
            <p className="text-2xl font-bold text-blue-800">₹{totalExpenses.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-green-600 font-medium">Your Share</p>
            <p className="text-2xl font-bold text-green-800">₹{(totalExpenses / Math.max(members.length, 1)).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-3 px-4 text-center ${activeTab === 'expenses' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`flex-1 py-3 px-4 text-center ${activeTab === 'settlements' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
        >
          Settlements
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-3 px-4 text-center ${activeTab === 'analytics' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
        >
          Analytics
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'expenses' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-3" />
                <p>No expenses yet. Add your first expense!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map(expense => (
                  <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryIcon(expense.category)}</span>
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-gray-500">
                          Paid by {getMemberName(expense.paidBy)} • {expense.date.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">₹{expense.amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">
                        Your share: ₹{(expense.splits.find(s => s.memberId === 'current-user')?.amount || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settlements' && (
          <SettlementSystem groupId={groupId} members={members} />
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-3">Spending by Category</h4>
              <div className="space-y-2">
                {categories.slice(1).map(category => {
                  const categoryExpenses = expenses.filter(exp => exp.category === category.id);
                  const categoryTotal = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                  const percentage = totalExpenses > 0 ? (categoryTotal / totalExpenses) * 100 : 0;
                  
                  return (
                    <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{category.icon}</span>
                        <span>{category.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{categoryTotal.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Monthly Trend</h4>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">Monthly analytics coming soon!</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddExpense && (
        <AddExpense
          groupId={groupId}
          members={members}
          onExpenseAdded={() => {
            setShowAddExpense(false);
          }}
          onClose={() => setShowAddExpense(false)}
        />
      )}
    </div>
  );
}