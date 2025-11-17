import { Users, Wallet } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description: string;
  totalPooled: number;
  status: 'active' | 'closed';
  createdAt: any;
  members?: any[];
}

interface GroupCardProps {
  group: Group;
  onClick: () => void;
}

export function GroupCard({ group, onClick }: GroupCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800 mb-1">{group.name}</h3>
          <p className="text-sm text-gray-600">{group.description}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            group.status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {group.status}
        </span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-5 h-5" />
          <span className="text-sm">{group.members?.length || 0} members</span>
        </div>
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-600" />
          <span className="text-lg font-bold text-gray-800">
            ₹{(group.totalPooled || 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
