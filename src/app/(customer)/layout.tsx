import Header from '@/components/customer/Header';
import Footer from '@/components/customer/Footer';
import Chatbot from '@/components/customer/Chatbot';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 scroll-mt-24">
        {children}
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
}
