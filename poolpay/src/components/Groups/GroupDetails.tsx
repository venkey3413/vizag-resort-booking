import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { GroupWallet } from './GroupWallet';
import { getGroupById } from '../../services/groupService';

interface GroupDetailsProps {
  groupId: string;
  onBack: () => void;
}

export function GroupDetails({ groupId, onBack }: GroupDetailsProps) {
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadGroup = async () => {
    setLoading(true);
    const groupData = await getGroupById(groupId);
    setGroup(groupData);
    setLoading(false);
  };

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  if (loading) {
    return <div className="text-center py-12">Loading group...</div>;
  }

  if (!group) {
    return <div className="text-center py-12">Group not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Groups
        </button>
        <h1 className="text-2xl font-bold">{group.name}</h1>
      </div>
      
      <GroupWallet group={group} onRefresh={loadGroup} />
    </div>
  );
}