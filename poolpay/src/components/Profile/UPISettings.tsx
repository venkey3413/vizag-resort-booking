import { useState, useEffect } from 'react';
import { CreditCard, Copy, Check, AlertCircle } from 'lucide-react';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { validateUpiOrPhone } from '../../utils/validation';

export function UPISettings() {
  const { user } = useAuth();
  const [upiId, setUpiId] = useState('');
  const [confirmUpiId, setConfirmUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadUserUPI();
  }, [user]);

  const loadUserUPI = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUpiId(userData.upiId || '');
        setPaymentLink(userData.paymentLink || '');
      }
    } catch (error) {
      console.error('Error loading UPI:', error);
    }
  };

  const generatePaymentLink = (userUpiId: string) => {
    // Generate UPI payment link for adding money to user's PoolPay account
    return `upi://pay?pa=${userUpiId}&pn=PoolPay-${user?.email}&am=&cu=INR&tn=Add money to PoolPay account`;
  };

  const handleSaveUPI = async () => {
    if (!user || !upiId || !confirmUpiId) return;
    
    if (upiId !== confirmUpiId) {
      alert('UPI IDs do not match');
      return;
    }

    if (!validateUpiOrPhone(upiId).isValid) {
      alert('Please enter a valid UPI ID');
      return;
    }

    setLoading(true);
    try {
      const newPaymentLink = generatePaymentLink(upiId);
      const userRef = doc(db, 'users', user.uid);
      
      // Use setDoc with merge to create document if it doesn't exist
      await setDoc(userRef, {
        upiId,
        paymentLink: newPaymentLink,
        email: user.email,
        updatedAt: new Date()
      }, { merge: true });

      setPaymentLink(newPaymentLink);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving UPI:', error);
      alert('Failed to save UPI ID');
    } finally {
      setLoading(false);
    }
  };

  const copyPaymentLink = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = paymentLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const upiMatch = upiId === confirmUpiId;
  const isValidUPI = validateUpiOrPhone(upiId).isValid;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold">UPI Settings</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your UPI ID
          </label>
          <input
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@upi"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              upiId && !isValidUPI ? 'border-red-500' : ''
            }`}
          />
          {upiId && !isValidUPI && (
            <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Please enter a valid UPI ID (e.g., name@paytm)</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm UPI ID
          </label>
          <input
            type="text"
            value={confirmUpiId}
            onChange={(e) => setConfirmUpiId(e.target.value)}
            placeholder="yourname@upi"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              confirmUpiId && !upiMatch ? 'border-red-500' : ''
            }`}
          />
          {confirmUpiId && !upiMatch && (
            <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>UPI IDs do not match</span>
            </div>
          )}
        </div>

        <button
          onClick={handleSaveUPI}
          disabled={loading || !upiId || !confirmUpiId || !upiMatch || !isValidUPI}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : saved ? 'Saved!' : 'Save UPI ID'}
        </button>

        {paymentLink && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Your Payment Link</h4>
            <p className="text-sm text-green-700 mb-3">
              Share this link to receive money in your PoolPay account:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={paymentLink}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-white border border-green-300 rounded"
              />
              <button
                onClick={copyPaymentLink}
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}