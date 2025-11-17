import { useState } from 'react';
import { Calculator, Users, Percent } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  upiId: string;
}

interface SplitCalculatorProps {
  members: Member[];
  totalAmount: number;
  onSplitCalculated: (splits: { memberId: string; amount: number }[]) => void;
}

export function SplitCalculator({ members, totalAmount, onSplitCalculated }: SplitCalculatorProps) {
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'percentage'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const [percentages, setPercentages] = useState<Record<string, number>>({});

  const calculateEqualSplit = () => {
    const perPerson = totalAmount / members.length;
    return members.map(member => ({ memberId: member.id || member.name, amount: perPerson }));
  };

  const calculateCustomSplit = () => {
    return members.map(member => ({ 
      memberId: member.id || member.name, 
      amount: customAmounts[member.id || member.name] || 0 
    }));
  };

  const calculatePercentageSplit = () => {
    return members.map(member => ({ 
      memberId: member.id || member.name, 
      amount: (totalAmount * (percentages[member.id || member.name] || 0)) / 100 
    }));
  };

  const handleCalculate = () => {
    let splits;
    switch (splitType) {
      case 'equal': splits = calculateEqualSplit(); break;
      case 'custom': splits = calculateCustomSplit(); break;
      case 'percentage': splits = calculatePercentageSplit(); break;
    }
    onSplitCalculated(splits);
  };

  const totalCustom = Object.values(customAmounts).reduce((sum, amt) => sum + (amt || 0), 0);
  const totalPercentage = Object.values(percentages).reduce((sum, pct) => sum + (pct || 0), 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold">Split Calculator</h3>
      </div>

      <div className="mb-6">
        <p className="text-lg font-medium mb-4">Total Amount: ₹{totalAmount.toFixed(2)}</p>
        
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSplitType('equal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${splitType === 'equal' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            <Users className="w-4 h-4" />
            Equal
          </button>
          <button
            onClick={() => setSplitType('custom')}
            className={`px-4 py-2 rounded-lg ${splitType === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Custom
          </button>
          <button
            onClick={() => setSplitType('percentage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${splitType === 'percentage' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            <Percent className="w-4 h-4" />
            Percentage
          </button>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {members.map(member => (
          <div key={member.id || member.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">{member.name}</span>
            
            {splitType === 'equal' && (
              <span className="text-blue-600 font-semibold">₹{(totalAmount / members.length).toFixed(2)}</span>
            )}
            
            {splitType === 'custom' && (
              <input
                type="number"
                value={customAmounts[member.id || member.name] || ''}
                onChange={(e) => setCustomAmounts({...customAmounts, [member.id || member.name]: parseFloat(e.target.value) || 0})}
                className="w-24 px-2 py-1 border rounded text-right"
                placeholder="0"
              />
            )}
            
            {splitType === 'percentage' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={percentages[member.id || member.name] || ''}
                  onChange={(e) => setPercentages({...percentages, [member.id || member.name]: parseFloat(e.target.value) || 0})}
                  className="w-16 px-2 py-1 border rounded text-right"
                  placeholder="0"
                  max="100"
                />
                <span>%</span>
                <span className="text-blue-600 font-semibold w-20 text-right">
                  ₹{((totalAmount * (percentages[member.id || member.name] || 0)) / 100).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {splitType === 'custom' && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm">Total: ₹{totalCustom.toFixed(2)} / ₹{totalAmount.toFixed(2)}</p>
          {Math.abs(totalCustom - totalAmount) > 0.01 && (
            <p className="text-red-600 text-sm">Amounts don't match total!</p>
          )}
        </div>
      )}

      {splitType === 'percentage' && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm">Total: {totalPercentage}% / 100%</p>
          {Math.abs(totalPercentage - 100) > 0.01 && (
            <p className="text-red-600 text-sm">Percentages don't add up to 100%!</p>
          )}
        </div>
      )}

      <button
        onClick={handleCalculate}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
      >
        Calculate Split
      </button>
    </div>
  );
}