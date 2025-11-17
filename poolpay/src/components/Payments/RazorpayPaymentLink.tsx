import { useState } from 'react';
import { Link, Copy, Check, Send } from 'lucide-react';
import { createPaymentLink } from '../../services/paymentService';

interface RazorpayPaymentLinkProps {
  amount: number;
  description: string;
  customerPhone: string;
  customerEmail: string;
  onLinkCreated: (link: string) => void;
}

export function RazorpayPaymentLink({ 
  amount, 
  description, 
  customerPhone, 
  customerEmail, 
  onLinkCreated 
}: RazorpayPaymentLinkProps) {
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');
  const [copied, setCopied] = useState(false);

  const generatePaymentLink = async () => {
    setLoading(true);
    try {
      const link = await createPaymentLink(amount, description, customerPhone, customerEmail);
      setPaymentLink(link.short_url);
      onLinkCreated(link.short_url);
    } catch (error) {
      console.error('Error creating payment link:', error);
      alert('Failed to create payment link');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-4">
        <Link className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold">Razorpay Payment Link</h3>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Amount:</span> ₹{amount}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {customerPhone}
            </div>
            <div className="col-span-2">
              <span className="font-medium">Description:</span> {description}
            </div>
          </div>
        </div>

        {!paymentLink ? (
          <button
            onClick={generatePaymentLink}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {loading ? (
              'Creating Link...'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Generate Payment Link
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={paymentLink}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm"
              />
              <button
                onClick={copyLink}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Share this link with the member to collect payment. They'll receive SMS and email notifications.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}