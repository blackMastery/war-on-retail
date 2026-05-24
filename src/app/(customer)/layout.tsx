import Header from '@/components/customer/Header';
import Footer from '@/components/customer/Footer';
import Chatbot from '@/components/customer/Chatbot';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
      <Chatbot />
    </div>
  );
}
