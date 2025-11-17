import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, Clock } from 'lucide-react';

interface Member {
  id?: string;
  name: string;
  upiId: string;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
  status: 'pending' | 'completed';
}

interface SettlementSystemProps {
  groupId: string;
  members: Member[];
}

export function SettlementSystem({ groupId, members }: SettlementSystemProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});

  const calculateSettlements = () => {
    // Mock calculation - replace with actual expense data
    const mockBalances: Record<string, number> = {};
    members.forEach(member => {
      mockBalances[member.name] = Math.random() * 1000 - 500; // Random balance for demo
    });
    
    setBalances(mockBalances);

    // Optimize settlements (minimize transactions)
    const creditors = Object.entries(mockBalances).filter(([_, balance]) => balance > 0);
    const debtors = Object.entries(mockBalances).filter(([_, balance]) => balance < 0);
    
    const newSettlements: Settlement[] = [];
    
    creditors.forEach(([creditorId, creditAmount]) => {
      debtors.forEach(([debtorId, debtAmount]) => {
        if (creditAmount > 0 && debtAmount < 0) {
          const settleAmount = Math.min(creditAmount, Math.abs(debtAmount));
          if (settleAmount > 0.01) {
            newSettlements.push({
              from: debtorId,
              to: creditorId,
              amount: settleAmount,
              status: 'pending'
            });
            mockBalances[creditorId] -= settleAmount;
            mockBalances[debtorId] += settleAmount;
          }
        }
      });
    });

    setSettlements(newSettlements);
  };

  useEffect(() => {
    if (members.length > 0) {
      calculateSettlements();
    }
  }, [members]);

  const markAsSettled = (index: number) => {
    const updated = [...settlements];
    updated[index].status = 'completed';
    setSettlements(updated);
  };

  const getMemberName = (memberId: string) => {
    return members.find(m => m.name === memberId)?.name || memberId;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-6">Settlement Summary</h3>

      {/* Balances */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Individual Balances</h4>
        <div className="space-y-2">
          {members.map(member => {
            const balance = balances[member.name] || 0;
            return (
              <div key={member.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span>{member.name}</span>
                <span className={`font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {balance >= 0 ? '+' : ''}₹{balance.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settlements */}
      <div>
        <h4 className="font-medium mb-3">Suggested Settlements</h4>
        {settlements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p>All settled up! 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {settlements.map((settlement, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getMemberName(settlement.from)}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{getMemberName(settlement.to)}</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">₹{settlement.amount.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  {settlement.status === 'pending' ? (
                    <>
                      <Clock className="w-5 h-5 text-yellow-500" />
                      <button
                        onClick={() => markAsSettled(index)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Mark Settled
                      </button>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-green-600 font-medium">Settled</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={calculateSettlements}
        className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
      >
        Recalculate Settlements
      </button>
    </div>
  );
}