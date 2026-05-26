import PromotionForm from '@/components/admin/PromotionForm';

export const metadata = { title: 'Admin · New promotion' };

export default function NewPromotionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New promotion</h1>
      <PromotionForm />
    </div>
  );
}
