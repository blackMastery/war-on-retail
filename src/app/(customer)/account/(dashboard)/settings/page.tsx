import { requireCustomer } from '@/lib/customer/auth';
import SettingsForm from './SettingsForm';

export const metadata = { title: 'Account settings' };

export default async function SettingsPage() {
  const { user, displayName } = await requireCustomer();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Settings</h2>
      <SettingsForm email={user.email ?? ''} initialName={displayName} />
    </div>
  );
}
