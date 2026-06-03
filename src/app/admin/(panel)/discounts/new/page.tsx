import DiscountCodeForm from '@/components/admin/DiscountCodeForm';

export const metadata = { title: 'Admin · New discount code' };

export default function NewDiscountPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New discount code</h1>
      <DiscountCodeForm />
    </div>
  );
}
