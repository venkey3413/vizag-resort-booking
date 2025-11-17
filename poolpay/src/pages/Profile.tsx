import { User, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UPISettings } from '../components/Profile/UPISettings';

export function Profile() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account and payment preferences</p>
        </div>

        <div className="grid gap-6">
          {/* User Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold">Account Information</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User ID</label>
                <p className="text-gray-500 text-sm font-mono">{user?.uid}</p>
              </div>
            </div>
          </div>

          {/* UPI Settings */}
          <UPISettings />
        </div>
      </div>
    </div>
  );
}