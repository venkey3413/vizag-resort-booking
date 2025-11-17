import { UserWallet } from '../components/Wallet/UserWallet';

export function Wallet() {
  return (
    <div className="bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <UserWallet />
      </div>
    </div>
  );
}