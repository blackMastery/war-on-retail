import ImportForm from './ImportForm';

export const metadata = { title: 'Admin · Import products' };

const SAMPLE = `name,sku,price,compare_at_price,category,brand,short_description,description,stock_quantity,is_featured,image_1,image_2,image_3,specifications
"Samsung 55\\" 4K Smart TV",SAMS-TV-55-4K-001,325000,365000,Televisions,Samsung,"Crystal-clear 4K resolution with smart features","Experience stunning picture quality…",15,true,https://example.com/tv-front.jpg,https://example.com/tv-side.jpg,,"{""screen_size"":""55 inches"",""resolution"":""4K UHD""}"`;

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">CSV product import</h1>

      <div className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold">How it works</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-secondary-foreground">
          <li>
            Required columns: <code>name</code>, <code>price</code>
          </li>
          <li>
            Optional: <code>sku</code>, <code>compare_at_price</code>, <code>category</code>{' '}
            (name or slug), <code>brand</code>, <code>short_description</code>,{' '}
            <code>description</code>, <code>stock_quantity</code>, <code>is_featured</code>,{' '}
            <code>is_active</code>, <code>image_1…image_4</code>, <code>specifications</code> (JSON)
          </li>
          <li>
            Rows are matched on <code>slug</code> (auto-generated from name when omitted). Existing
            slugs are updated, new ones inserted.
          </li>
        </ul>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            Show sample CSV
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-secondary p-3 text-xs text-foreground">
            {SAMPLE}
          </pre>
        </details>
      </div>

      <ImportForm />
    </div>
  );
}
