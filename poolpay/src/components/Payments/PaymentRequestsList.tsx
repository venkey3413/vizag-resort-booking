import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface PaymentRequest {
  id: string;
  memberName: string;
  memberUpiId: string;
  amount: number;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: any;
}

interface PaymentRequestsListProps {
  groupId: string;
}

export function PaymentRequestsList({ groupId }: PaymentRequestsListProps) {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'paymentRequests'),
      where('groupId', '==', groupId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentRequest[];
      
      setRequests(requestsData.sort((a, b) => b.requestedAt?.toDate() - a.requestedAt?.toDate()));
      setLoading(false);
    });

    return unsubscribe;
  }, [groupId]);

  const markAsAccepted = async (requestId: string, amount: number) => {
    try {
      // Update request status
      await updateDoc(doc(db, 'paymentRequests', requestId), {
        status: 'accepted',
        acceptedAt: new Date()
      });

      // Add to group wallet
      await updateDoc(doc(db, 'groups', groupId), {
        totalPooled: increment(amount)
      });

      alert('Payment accepted! Amount added to group wallet.');
    } catch (error) {
      console.error('Error accepting payment:', error);
    }
  };

  const markAsRejected = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'paymentRequests', requestId), {
        status: 'rejected',
        rejectedAt: new Date()
      });
    } catch (error) {
      console.error('Error rejecting payment:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <RefreshCw className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6">
        <div className="text-center py-8 text-gray-500">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p>Loading payment requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Payment Requests</h3>
      
      {requests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No payment requests yet</p>
          <p className="text-sm mt-1">Send UPI requests to pool funds</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getStatusIcon(request.status)}
                  <div>
                    <p className="font-medium">{request.memberName}</p>
                    <p className="text-sm text-gray-500">{request.memberUpiId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">₹{request.amount.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 capitalize">{request.status}</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{request.description}</p>
              
              {request.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => markAsAccepted(request.id, request.amount)}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                  >
                    Accept & Pool
                  </button>
                  <button
                    onClick={() => markAsRejected(request.id)}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}