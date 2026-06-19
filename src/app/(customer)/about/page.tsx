import { pageMetadata } from '@/lib/page-seo';
import PageBody from '@/components/customer/PageBody';

export async function generateMetadata() {
  return pageMetadata('about', { title: 'About' });
}

export default function AboutPage() {
  return (
    <div className="container py-10">
      <div className="prose-theme max-w-3xl">
        <PageBody pageId="about" />
      </div>
    </div>
  );
}
