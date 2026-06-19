import { requireCustomer } from '@/lib/customer/auth';
import SettingsForm from './SettingsForm';

export const metadata = { title: 'Account settings' };

export default async function SettingsPage() {
  const { user, displayName, customers } = await requireCustomer();
  // Most-recent linked row is the "primary" — its phone is what we show/edit.
  const initialPhone = customers[0]?.phone ?? '';
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Settings</h2>
      <SettingsForm
        email={user.email ?? ''}
        initialName={displayName}
        initialPhone={initialPhone}
      />
    </div>
  );
}
