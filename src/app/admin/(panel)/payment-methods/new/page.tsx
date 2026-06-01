import PaymentMethodForm from '@/components/admin/PaymentMethodForm';

export const metadata = { title: 'Admin · New payment method' };

export default function NewPaymentMethodPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New payment method</h1>
      <PaymentMethodForm />
    </div>
  );
}
