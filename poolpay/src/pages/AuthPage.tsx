import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { LoginForm } from '../components/Auth/LoginForm';
import { SignUpForm } from '../components/Auth/SignUpForm';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-lg">
            <Wallet className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">PoolPay</h1>
          <p className="text-blue-100">Pool funds together, pay with ease</p>
        </div>

        {mode === 'login' ? (
          <LoginForm onToggleMode={() => setMode('signup')} />
        ) : (
          <SignUpForm onToggleMode={() => setMode('login')} />
        )}
      </div>
    </div>
  );
}
