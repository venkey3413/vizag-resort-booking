import { useState } from 'react';
import { Send, Users, Calculator, AlertCircle, Copy, Check } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { validateAmount } from '../../utils/validation';

interface Member {
  name: string;
  upiId: string;
}

interface SendUPIRequestsProps {
  groupId: string;
  members: Member[];
  paymentMode: 'p2p' | 'escrow';
  onRequestsSent: () => void;
}

export function SendUPIRequests({ groupId, members, paymentMode, onRequestsSent }: SendUPIRequestsProps) {
  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualSplit, setManualSplit] = useState(false);
  const [memberAmounts, setMemberAmounts] = useState<{[key: string]: number}>({});
  const [copiedLinks, setCopiedLinks] = useState<{[key: string]: boolean}>({});

  const amountPerPerson = totalAmount ? parseFloat(totalAmount) / members.length : 0;
  
  // Initialize member amounts when switching to manual split
  const initializeMemberAmounts = () => {
    const amounts: {[key: string]: number} = {};
    members.forEach((member, index) => {
      amounts[index] = amountPerPerson;
    });
    setMemberAmounts(amounts);
  };
  
  // Update member amount
  const updateMemberAmount = (memberIndex: number, amount: number) => {
    setMemberAmounts(prev => ({
      ...prev,
      [memberIndex]: amount
    }));
  };
  
  // Get total of manual amounts
  const manualTotal = Object.values(memberAmounts).reduce((sum, amount) => sum + (amount || 0), 0);
  
  // Generate UPI payment link for specific member and amount
  const generateUPILink = (member: Member, amount: number) => {
    const ownerUPI = '9492394828@ybl'; // This should come from group owner's profile
    return `upi://pay?pa=${ownerUPI}&pn=PoolPay-${member.name}&am=${amount}&cu=INR&tn=${encodeURIComponent(description || 'Group payment')}`;
  };
  
  // Copy UPI link for member
  const copyUPILink = (memberIndex: number, member: Member, amount: number) => {
    const upiLink = generateUPILink(member, amount);
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(upiLink);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = upiLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    
    setCopiedLinks(prev => ({ ...prev, [memberIndex]: true }));
    setTimeout(() => {
      setCopiedLinks(prev => ({ ...prev, [memberIndex]: false }));
    }, 2000);
  };

  const sendUPIRequests = async () => {
    if (!totalAmount || !description || members.length === 0) return;

    setLoading(true);
    try {
      // Send UPI collect request to each member
      for (const member of members) {
        // Create payment request in Firebase
        await addDoc(collection(db, 'paymentRequests'), {
          groupId,
          memberName: member.name,
          memberUpiId: member.upiId,
          amount: amountPerPerson,
          description,
          status: 'pending',
          requestedAt: new Date()
        });

        // Generate UPI URL based on payment mode
        let upiUrl;
        if (paymentMode === 'escrow') {
          // Use Razorpay payment link for escrow
          upiUrl = `upi://pay?pa=poolpay@razorpay&pn=PoolPay&am=${amountPerPerson}&tn=${encodeURIComponent(description)}&mode=02`;
        } else {
          // Direct P2P to member
          upiUrl = `upi://pay?pa=${member.upiId}&pn=PoolPay&am=${amountPerPerson}&tn=${encodeURIComponent(description)}&mode=02`;
        }
        
        // Open UPI app
        if (navigator.userAgent.match(/Android/i)) {
          window.open(upiUrl, '_blank');
        }
      }

      onRequestsSent();
    } catch (error) {
      console.error('Error sending requests:', error);
      alert('Failed to send requests');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <Send className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold">Send UPI Requests</h3>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Amount to Pool
          </label>
          <div>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="5000"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                totalAmount && !validateAmount(totalAmount) ? 'border-red-500' : ''
              }`}
            />
            {totalAmount && !validateAmount(totalAmount) && (
              <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Enter amount between ₹1 and ₹1,00,000</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Trip to Goa - Hotel booking"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {totalAmount && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">Split Calculation</span>
              </div>
              <button
                onClick={() => {
                  setManualSplit(!manualSplit);
                  if (!manualSplit) initializeMemberAmounts();
                }}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                {manualSplit ? 'Equal Split' : 'Manual Split'}
              </button>
            </div>
            
            {!manualSplit ? (
              <p className="text-blue-700">
                ₹{amountPerPerson.toFixed(2)} per person ({members.length} members)
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-blue-700 text-sm mb-2">Adjust individual amounts:</p>
                {members.map((member, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-24 truncate">{member.name}:</span>
                    <input
                      type="number"
                      value={memberAmounts[index] || 0}
                      onChange={(e) => updateMemberAmount(index, parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500"
                      step="0.01"
                      min="0"
                    />
                    <span className="text-sm text-gray-600">₹</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-blue-200">
                  <p className="text-sm">
                    <span className="font-medium">Total: ₹{manualTotal.toFixed(2)}</span>
                    {manualTotal !== parseFloat(totalAmount) && (
                      <span className="text-red-600 ml-2">
                        (Difference: ₹{(parseFloat(totalAmount) - manualTotal).toFixed(2)})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Payment Links for Members:
        </h4>
        <div className="space-y-3">
          {members.map((member, index) => {
            const memberAmount = manualSplit ? (memberAmounts[index] || 0) : amountPerPerson;
            return (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">{member.name}</span>
                    <p className="text-sm text-gray-500">{member.upiId}</p>
                  </div>
                  <span className="text-blue-600 font-semibold text-lg">
                    ₹{memberAmount.toFixed(2)}
                  </span>
                </div>
                
                {totalAmount && description && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">UPI Payment Link:</span>
                      <button
                        onClick={() => copyUPILink(index, member, memberAmount)}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center gap-1"
                      >
                        {copiedLinks[index] ? (
                          <><Check className="w-3 h-3" /> Copied</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copy Link</>
                        )}
                      </button>
                    </div>
                    <div className="bg-white p-2 rounded border text-xs text-gray-600 break-all">
                      {generateUPILink(member, memberAmount)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Share this link with {member.name} to pay ₹{memberAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg mb-4">
        <p className="text-sm text-gray-600">
          {paymentMode === 'escrow' 
            ? '💰 Funds will be held in secure escrow wallet' 
            : '⚡ Direct transfers between members'
          }
        </p>
      </div>

      <button
        onClick={sendUPIRequests}
        disabled={loading || !totalAmount || !description || members.length === 0 || !validateAmount(totalAmount)}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Sending Requests...' : `Send ${paymentMode === 'escrow' ? 'Escrow' : 'P2P'} Requests (₹${amountPerPerson.toFixed(2)} each)`}
      </button>
    </div>
  );
}