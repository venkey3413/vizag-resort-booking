import { useState } from 'react';
import { UserPlus, UserMinus, Users, Mail, Phone } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface Member {
  id: string;
  name: string;
  email: string;
  upiId: string;
  role: 'admin' | 'member';
  userId?: string;
}

interface MemberManagementProps {
  groupId: string;
  members: Member[];
  isAdmin: boolean;
  onMembersUpdated: () => void;
}

export function MemberManagement({ groupId, members, isAdmin, onMembersUpdated }: MemberManagementProps) {
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Add member form
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    upiId: ''
  });

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.upiId) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // Check if user exists in PoolPay
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', newMember.email)
      );
      const userSnapshot = await getDocs(usersQuery);
      
      let userId = null;
      if (!userSnapshot.empty) {
        userId = userSnapshot.docs[0].id;
      }

      // Add member to group
      await addDoc(collection(db, 'group_members'), {
        group_id: groupId,
        user_id: userId,
        display_name: newMember.name,
        email: newMember.email,
        upi_id: newMember.upiId,
        role: 'member',
        added_by: user?.uid,
        added_at: new Date()
      });

      setNewMember({ name: '', email: '', upiId: '' });
      setShowAddForm(false);
      onMembersUpdated();
      alert('Member added successfully!');
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the group?`)) return;

    setLoading(true);
    try {
      // Delete the member document from group_members collection
      await deleteDoc(doc(db, 'group_members', memberId));
      
      // Refresh the group data to update the UI
      onMembersUpdated();
      alert('Member removed successfully!');
    } catch (error) {
      console.error('Error removing member:', error);
      alert(`Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-semibold">Group Members</h3>
        </div>
        <div className="space-y-3">
          {members.map((member, index) => (
            <div key={member.id || `readonly-member-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{member.name}</span>
                  {member.role === 'admin' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Admin</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{member.email}</p>
                <p className="text-sm text-gray-500">{member.upiId}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-semibold">Manage Members</h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-3">Add New Member</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Full Name"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="UPI ID"
              value={newMember.upiId}
              onChange={(e) => setNewMember({ ...newMember, upiId: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAddMember}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {members.map((member, index) => (
          <div key={member.id || `admin-member-${index}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{member.name}</span>
                {member.role === 'admin' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Admin</span>
                )}
                {member.userId && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">PoolPay User</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {member.email}
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {member.upiId}
                </div>
              </div>
            </div>
            
            {member.role !== 'admin' && (
              <button
                onClick={() => handleRemoveMember(member.id, member.name)}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:bg-gray-200"
              >
                <UserMinus className="w-4 h-4" />
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No members in this group yet</p>
        </div>
      )}
    </div>
  );
}