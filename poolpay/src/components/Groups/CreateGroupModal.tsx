import { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { validateUpiOrPhone, validateEmail } from '../../utils/validation';

interface CreateGroupModalProps {
  onClose: () => void;
  onGroupCreated: () => void;
}

interface Member {
  name: string;
  email: string;
  upiId: string;
}

export function CreateGroupModal({ onClose, onGroupCreated }: CreateGroupModalProps) {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<Member[]>([{ name: '', email: '', upiId: '' }]);
  const [loading, setLoading] = useState(false);

  const addMember = () => {
    setMembers([...members, { name: '', email: '', upiId: '' }]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof Member, value: string) => {
    const newMembers = [...members];
    newMembers[index][field] = value;
    setMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !groupName) return;

    setLoading(true);
    try {
      const groupData = {
        name: groupName,
        description: description || '',
        createdBy: user.uid,
        totalPooled: 0,
        status: 'active',
        createdAt: new Date(),
        members: members.filter(m => m.name && m.upiId && validateUpiOrPhone(m.upiId).isValid)
      };

      await addDoc(collection(db, 'groups'), groupData);
      
      onGroupCreated();
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Create New Group</h2>
          <button onClick={onClose} className="text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Trip to Goa"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Weekend trip with friends"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Add Members
              </label>
              <button
                type="button"
                onClick={addMember}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </button>
            </div>

            <div className="space-y-3">
              {members.map((member, index) => (
                <div key={index} className="flex gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => updateMember(index, 'name', e.target.value)}
                      placeholder="Member Name *"
                      className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <div>
                      <input
                        type="email"
                        value={member.email}
                        onChange={(e) => updateMember(index, 'email', e.target.value)}
                        placeholder="Email (optional)"
                        className={`w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 ${
                          member.email && !validateEmail(member.email) ? 'border-red-500' : ''
                        }`}
                      />
                      {member.email && !validateEmail(member.email) && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                          <AlertCircle className="w-3 h-3" />
                          <span>Enter valid email address</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={member.upiId}
                        onChange={(e) => updateMember(index, 'upiId', e.target.value)}
                        placeholder="UPI ID or Phone (9876543210) *"
                        className={`w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 ${
                          member.upiId && !validateUpiOrPhone(member.upiId).isValid ? 'border-red-500' : ''
                        }`}
                        required
                      />
                      {member.upiId && !validateUpiOrPhone(member.upiId).isValid && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                          <AlertCircle className="w-3 h-3" />
                          <span>Enter valid UPI ID (name@bank) or 10-digit phone number</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !groupName}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}