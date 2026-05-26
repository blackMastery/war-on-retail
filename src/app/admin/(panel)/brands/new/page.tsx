import BrandForm from '@/components/admin/BrandForm';

export const metadata = { title: 'Admin · New brand' };

export default function NewBrandPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New brand</h1>
      <BrandForm />
    </div>
  );
}
