import { useState } from 'react';
import { Users, Wallet, Shield, Zap } from 'lucide-react';

interface PaymentModeSelectorProps {
  currentMode: 'p2p' | 'escrow';
  onModeChange: (mode: 'p2p' | 'escrow') => void;
}

export function PaymentModeSelector({ currentMode, onModeChange }: PaymentModeSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="font-semibold mb-3">Payment Mode</h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onModeChange('p2p')}
          className={`p-4 rounded-lg border-2 transition-all ${
            currentMode === 'p2p' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-green-600" />
            <span className="font-medium">Direct P2P</span>
          </div>
          <p className="text-sm text-gray-600">Instant UPI transfers between members</p>
          <div className="mt-2 text-xs text-green-600">✓ No fees • ✓ Instant</div>
        </button>

        <button
          onClick={() => onModeChange('escrow')}
          className={`p-4 rounded-lg border-2 transition-all ${
            currentMode === 'escrow' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Escrow Wallet</span>
          </div>
          <p className="text-sm text-gray-600">Secure fund holding & distribution</p>
          <div className="mt-2 text-xs text-blue-600">✓ Secure • ✓ Dispute protection</div>
        </button>
      </div>
    </div>
  );
}