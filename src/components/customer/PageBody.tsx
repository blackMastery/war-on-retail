import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getPageBody } from '@/lib/page-body';

/**
 * Renders the admin-editable Markdown body for one of the long-form pages.
 *
 * Server component — loads + templates the Markdown via `getPageBody`, then
 * defers actual rendering to `react-markdown` (server-side). Styles come
 * from the parent `prose` typography wrapper, so headings / lists / links /
 * tables inherit consistent appearance with no per-page CSS.
 *
 * Links inside the body are post-processed so external URLs open in a new
 * tab with safe `rel`. Internal links (relative paths, `tel:`, `mailto:`)
 * stay default.
 */
export default async function PageBody({ pageId }: { pageId: string }) {
  const data = await getPageBody(pageId);
  if (!data) return null;

  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...rest }) => {
            const isExternal = typeof href === 'string' && /^https?:\/\//i.test(href);
            return (
              <a
                href={href}
                {...(isExternal
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                {...rest}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {data.markdown}
      </ReactMarkdown>
      <p className="mt-8 text-xs text-gray-500">
        <em>
          Last updated:{' '}
          {new Date(data.updatedAt).toLocaleDateString('en-GY', {
            dateStyle: 'long',
          })}
        </em>
      </p>
    </>
  );
}
