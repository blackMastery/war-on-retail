import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateDiscountCode } from '@/lib/discounts/validation';
import { calculateDiscount } from '@/lib/discounts/calculation';

export const runtime = 'nodejs';

/**
 * POST /api/discounts/validate
 *
 * Cart-time discount check + estimate. The customer's `DiscountCodeInput`
 * posts the live cart here; we validate the code and return the GYD savings to
 * show in the summary.
 *
 * This is a *UX estimate* only — the subtotal is client-supplied. The
 * authoritative check + redemption happens inside the `place_order` RPC against
 * DB-locked prices. The two agree because the validation/calculation logic is
 * shared (here) and mirrored (in SQL).
 *
 * Runs server-side with the service-role client because the discount tables
 * have RLS with no public policies. We never return the raw code list — only a
 * single validation result for the submitted code.
 */
const Body = z.object({
  code: z.string().trim().min(1, 'Enter a discount code.').max(64),
  subtotal: z.number().nonnegative(),
  productIds: z.array(z.string().uuid()).default([]),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        price: z.number().nonnegative(),
        quantity: z.number().int().min(1),
      }),
    )
    .default([]),
  sessionId: z.string().trim().max(128).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    );
  }

  const { code, subtotal, productIds, items, sessionId, phone } = parsed.data;
  // Derive product ids from the items if the caller didn't send them separately.
  const ids = productIds.length ? productIds : items.map((i) => i.productId);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const supabase = createAdminClient();
  const result = await validateDiscountCode(supabase, code, {
    subtotal,
    productIds: ids,
    itemCount,
    customerPhone: phone ?? null,
    sessionId: sessionId ?? null,
  });

  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const applied = calculateDiscount(result.code, { subtotal, items });
  return NextResponse.json({ discount: applied });
}
