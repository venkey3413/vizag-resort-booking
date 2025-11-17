import { useState, useEffect } from 'react';
import { Plus, LogOut, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserGroups, Group } from '../services/groupService';
import { GroupCard } from '../components/Groups/GroupCard';
import { GroupDetails } from '../components/Groups/GroupDetails';
import { CreateGroupModal } from '../components/Groups/CreateGroupModal';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const unsubscribe = getUserGroups(user.uid, (userGroups) => {
        setGroups(userGroups);
        setLoading(false);
      });
      return unsubscribe;
    }
  }, [user]);

  const loadGroups = () => {
    if (user) {
      getUserGroups(user.uid, (userGroups) => {
        setGroups(userGroups);
      });
    }
  };

  if (selectedGroupId) {
    return (
      <GroupDetails
        groupId={selectedGroupId}
        onBack={() => {
          setSelectedGroupId(null);
          loadGroups();
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Welcome to PoolPay!</h1>
              <p className="text-gray-600">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Your Groups</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Create Group
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-600">Loading groups...</div>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No groups yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first group to start pooling funds with friends
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onClick={() => setSelectedGroupId(group.id)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onGroupCreated={() => {
            setShowCreateModal(false);
            loadGroups();
          }}
        />
      )}
    </div>
  );
}