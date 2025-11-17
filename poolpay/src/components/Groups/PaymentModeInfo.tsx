import { AlertCircle, CheckCircle } from 'lucide-react';

export function PaymentModeInfo() {
  const hasRazorpayCredentials = !!import.meta.env.VITE_RAZORPAY_KEY_ID;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        {hasRazorpayCredentials ? (
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
        )}
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">
            {hasRazorpayCredentials ? 'Razorpay Integration Active' : 'Demo Mode Active'}
          </h4>
          <p className="text-sm text-gray-600">
            {hasRazorpayCredentials 
              ? 'Real Razorpay API is connected. Payment links and escrow will work with actual money transfers.'
              : 'Using mock Razorpay service for testing. Add VITE_RAZORPAY_KEY_ID to .env for real payments.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}