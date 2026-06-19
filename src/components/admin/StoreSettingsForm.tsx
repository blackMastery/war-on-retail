'use client';

import { useActionState } from 'react';
import {
  updateStoreSettings,
  type StoreSettingsFormState,
} from '@/app/admin/(panel)/settings/actions';
import type { StoreSettings } from '@/types/database';

const initial: StoreSettingsFormState = {};
const INPUT =
  'mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring text-sm';

export default function StoreSettingsForm({ settings }: { settings: StoreSettings | null }) {
  const [state, action, pending] = useActionState(updateStoreSettings, initial);
  const err = (k: string) => state.fieldErrors?.[k];

  // Pre-fill helper — falls back to '' when the DB hasn't supplied a value
  // so React doesn't switch the input from uncontrolled to controlled.
  const v = <K extends keyof StoreSettings>(k: K): string => {
    const raw = settings?.[k];
    return raw == null ? '' : String(raw);
  };

  return (
    <form action={action} className="space-y-6">
      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
      )}
      {state.saved && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          ✓ Settings saved. The change is live on the customer site within a minute.
        </div>
      )}

      {/* ----- Brand ----- */}
      <Section title="Brand">
        <Field
          label="Store name"
          name="name"
          defaultValue={v('name')}
          error={err('name')}
          hint="Shown in the browser tab, the footer, and SEO tags."
        />
        <Field
          label="Tagline / description"
          name="description"
          textarea
          rows={2}
          defaultValue={v('description')}
          error={err('description')}
          hint="One-sentence pitch. Used as the default meta description."
        />
        <Field
          label="Site URL"
          name="url"
          type="url"
          defaultValue={v('url')}
          error={err('url')}
          placeholder="https://www.waronretailguyana.com"
          hint="The canonical https:// URL — used in SEO + sitemap."
        />
      </Section>

      {/* ----- Contact ----- */}
      <Section title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Public email"
            name="email"
            type="email"
            defaultValue={v('email')}
            error={err('email')}
            placeholder="info@waronretail.com"
          />
          <Field
            label="Admin email"
            name="admin_email"
            type="email"
            defaultValue={v('admin_email')}
            error={err('admin_email')}
            placeholder="admin@waronretail.com"
            hint="Internal — order notifications & system mail."
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            defaultValue={v('phone')}
            error={err('phone')}
            placeholder="592-694-3827"
          />
          <Field
            label="WhatsApp number"
            name="whatsapp"
            defaultValue={v('whatsapp')}
            error={err('whatsapp')}
            placeholder="5926943827"
            hint="Digits only, country code first. No + or spaces."
          />
        </div>
      </Section>

      {/* ----- Address + GPS ----- */}
      <Section title="Store location">
        <Field
          label="Street address"
          name="address"
          textarea
          rows={2}
          defaultValue={v('address')}
          error={err('address')}
          placeholder="House number, street, city, country"
          hint="Shown on the pickup tab of checkout and on the contact page."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Latitude"
            name="latitude"
            type="number"
            step="0.000001"
            defaultValue={v('latitude')}
            error={err('latitude')}
            placeholder="6.801279"
            hint="Decimal degrees, -90 to 90. Leave blank to fall back to address."
          />
          <Field
            label="Longitude"
            name="longitude"
            type="number"
            step="0.000001"
            defaultValue={v('longitude')}
            error={err('longitude')}
            placeholder="-58.155013"
            hint="Decimal degrees, -180 to 180."
          />
        </div>
        <GpsHelp />
      </Section>

      {/* ----- Hours ----- */}
      <Section title="Opening hours">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Weekdays"
            name="hours_weekdays"
            defaultValue={v('hours_weekdays')}
            error={err('hours_weekdays')}
            placeholder="Mon–Fri 9:00 AM – 6:00 PM"
          />
          <Field
            label="Saturday"
            name="hours_saturday"
            defaultValue={v('hours_saturday')}
            error={err('hours_saturday')}
            placeholder="Sat 9:00 AM – 4:00 PM"
          />
          <Field
            label="Sunday"
            name="hours_sunday"
            defaultValue={v('hours_sunday')}
            error={err('hours_sunday')}
            placeholder="Sun Closed"
          />
        </div>
      </Section>

      {/* ----- Social ----- */}
      <Section title="Social links">
        <Field
          label="Facebook URL"
          name="facebook_url"
          type="url"
          defaultValue={v('facebook_url')}
          error={err('facebook_url')}
          placeholder="https://facebook.com/waronretail"
          hint="Leave blank to hide from the footer."
        />
        <Field
          label="Instagram URL"
          name="instagram_url"
          type="url"
          defaultValue={v('instagram_url')}
          error={err('instagram_url')}
          placeholder="https://instagram.com/waronretail"
        />
        <Field
          label="Twitter / X URL"
          name="twitter_url"
          type="url"
          defaultValue={v('twitter_url')}
          error={err('twitter_url')}
          placeholder="https://twitter.com/waronretail"
        />
      </Section>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t border-border bg-card px-4 py-3 sm:mx-0 sm:rounded-md sm:px-0 sm:pb-0">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary text-primary-foreground px-5 py-2 font-semibold shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}

// ---------- Section wrapper ----------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
      <h2 className="font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// ---------- Field ----------

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  step?: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  textarea?: boolean;
  rows?: number;
};

function Field({
  label,
  name,
  type = 'text',
  step,
  defaultValue,
  placeholder,
  hint,
  error,
  textarea,
  rows = 3,
}: FieldProps) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-secondary-foreground">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          rows={rows}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={INPUT}
        />
      ) : (
        <input
          name={name}
          type={type}
          step={step}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={INPUT}
        />
      )}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

// ---------- GPS helper ----------

function GpsHelp() {
  return (
    <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-900">
      <p className="font-semibold">Where do GPS coordinates come from?</p>
      <ol className="mt-1 ml-4 list-decimal space-y-0.5">
        <li>Open Google Maps and find the store.</li>
        <li>Right-click the exact pin location → click the coordinates that appear at the top of the menu (they copy automatically).</li>
        <li>Paste here — the first number is latitude, the second is longitude.</li>
      </ol>
      <p className="mt-2">
        Leaving these blank is fine — checkout will fall back to a map of the
        address. Filling them in gives a precise pin.
      </p>
    </div>
  );
}
