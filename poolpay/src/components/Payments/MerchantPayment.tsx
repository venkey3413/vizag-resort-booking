import { useState } from 'react';
import { QrCode, Scan, CreditCard, AlertCircle } from 'lucide-react';
import { QRScanner } from './QRScanner';
import { payMerchant, processUPIPayment } from '../../services/paymentService';
import { validateUpiOrPhone, validateAmount } from '../../utils/validation';

interface MerchantPaymentProps {
  groupId: string;
  availableBalance: number;
  paymentMode: 'p2p' | 'escrow';
  onPaymentComplete: () => void;
}

export function MerchantPayment({ groupId, availableBalance, paymentMode, onPaymentComplete }: MerchantPaymentProps) {
  const [merchantUpiId, setMerchantUpiId] = useState('');
  const [amount, setAmount] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleScan = (upiId: string) => {
    setMerchantUpiId(upiId);
    setShowScanner(false);
  };

  const handlePayment = async () => {
    if (!merchantUpiId || !amount || !merchantName) return;
    
    const paymentAmount = parseFloat(amount);
    if (paymentAmount > availableBalance) {
      alert('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      if (paymentMode === 'escrow') {
        await payMerchant(groupId, merchantUpiId, paymentAmount, merchantName);
      } else {
        // P2P mode - direct payment
        processUPIPayment(merchantUpiId, paymentAmount, merchantName);
      }
      onPaymentComplete();
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold">Pay Merchant</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Merchant Name
          </label>
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Restaurant, Hotel, etc."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Merchant Phone Number
          </label>
          <div>
            <input
              type="tel"
              value={merchantUpiId}
              onChange={(e) => setMerchantUpiId(e.target.value)}
              placeholder="9876543210"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                merchantUpiId && !validateUpiOrPhone(merchantUpiId).isValid ? 'border-red-500' : ''
              }`}
            />
            {merchantUpiId && !validateUpiOrPhone(merchantUpiId).isValid && (
              <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Enter valid 10-digit phone number</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-gray-500">or</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scan UPI QR Code
          </label>
          <button
            onClick={() => setShowScanner(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500"
          >
            <Scan className="w-5 h-5" />
            Scan QR Code
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              max={availableBalance}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                amount && (!validateAmount(amount) || parseFloat(amount) > availableBalance) ? 'border-red-500' : ''
              }`}
            />
            {amount && (!validateAmount(amount) || parseFloat(amount) > availableBalance) && (
              <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>
                  {parseFloat(amount) > availableBalance ? 'Amount exceeds available balance' : 'Enter valid amount'}
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Available: ₹{availableBalance.toFixed(2)}
          </p>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <p className="text-sm text-gray-600">
            {paymentMode === 'escrow' 
              ? '💰 Payment from group escrow wallet' 
              : '⚡ Direct payment (requires manual coordination)'
            }
          </p>
        </div>

        <button
          onClick={handlePayment}
          disabled={loading || !merchantUpiId || !amount || !merchantName || !validateUpiOrPhone(merchantUpiId).isValid || !validateAmount(amount) || (paymentMode === 'escrow' && parseFloat(amount) > availableBalance)}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : `${paymentMode === 'escrow' ? 'Pay from Escrow' : 'Send Payment Link'} ₹${amount || '0'}`}
        </button>
      </div>

      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}