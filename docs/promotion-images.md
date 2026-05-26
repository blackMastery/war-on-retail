# Promotion image guide

Practical guidance for the people uploading specials at `/admin/promotions`. Follow these specs and your promo will look sharp on every screen — phones to 4K monitors — without cropping the important parts.

---

## TL;DR

| | Recommended size | Aspect ratio | Max file size | Format |
|---|---|---|---|---|
| **Featured** (large slot) | **2000 × 1250 px** | 16:10 | 400 KB | WebP (preferred), JPEG |
| **Side tile** (small slot) | **1200 × 675 px** | 16:9 desktop / 16:10 mobile — use 16:10 (1200 × 750 px) to be safe on both | 200 KB | WebP, JPEG |
| **Solo / only promotion** | 2000 × 1250 px | 16:10 | 400 KB | WebP, JPEG |

Keep the message in the **centre 80 %** of the frame — the edges may be cropped on narrow viewports.

Upload via the admin panel: **Admin → Promotions → New promotion**.

---

## How the mosaic decides slot sizes

The homepage renders one of three layouts depending on how many active promotions you have.

### 1 active promotion → full-width banner
```
┌───────────────────────────────────┐
│                                   │
│              FEATURED             │   16:10
│           (full container)        │
│                                   │
└───────────────────────────────────┘
```

### 2 active promotions → featured + one side tile
```
┌──────────────────────┬────────────┐
│                      │            │
│      FEATURED        │  TILE 1    │
│   (2 cols on desktop)│  (1 col)   │
│                      │            │
└──────────────────────┴────────────┘
```

### 3–5 active promotions → featured + stacked tiles
```
┌──────────────────────┬────────────┐
│                      │  TILE 1    │
│                      ├────────────┤
│      FEATURED        │  TILE 2    │
│                      ├────────────┤
│                      │  TILE 3    │
└──────────────────────┴────────────┘
```

On **mobile (< 1024 px wide)** every layout collapses to a single column — featured first, then tiles stacked beneath in pairs.

> **Which one is the featured?** The first promotion marked **Featured** in the form takes the large slot. If none are marked Featured, the first one by display order takes it.

---

## Pixel dimensions explained

Modern phones and laptops have high-density "retina" screens that pack 2 pixels into every CSS pixel. To stay sharp, source images need to be at least 2× the display size.

| Display size | Render width (CSS) | Source image width (2×) |
|---|---|---|
| Featured on a 1280 px-wide laptop | ~830 px | **≥ 1660 px** → use **2000 px** |
| Side tile on the same laptop | ~410 px | ~820 px → use **1200 px** |
| Featured on a 1920 px monitor | ~1250 px | ~2500 px → use **2500 px** if you have it |
| Featured on mobile (full-width) | ~390 px | ~780 px → 2000 px is plenty |

Going larger than ~2500 px is wasted bandwidth — Next.js `<Image>` automatically generates smaller WebP / AVIF variants and serves the right size per viewport.

---

## Composition rules

The mosaic uses `object-cover`, meaning the image is **centre-cropped** to fill its slot. Two things follow from this:

1. **The aspect ratio of your source matters.** Upload 16:10 for the featured slot and 16:9 (or 16:10) for tiles — otherwise the top, bottom, or sides get sliced off.
2. **Keep the message in the centre.** Anything within 10 % of any edge can vanish on narrow viewports. Use this safe-zone diagram:

```
┌───────────────────────────────────┐
│   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │  ← 10 % unsafe (may crop)
│   ░                          ░    │
│   ░    ╔══════════════════╗  ░    │
│   ░    ║                  ║  ░    │
│   ░    ║   SAFE ZONE      ║  ░    │  ← put text, logos, prices, faces here
│   ░    ║   (centre 80 %)  ║  ░    │
│   ░    ║                  ║  ░    │
│   ░    ╚══════════════════╝  ░    │
│   ░                          ░    │
│   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │
└───────────────────────────────────┘
```

### Things to avoid
- Important text touching the edges of the source image
- Faces or product close-ups near a corner — they'll be the first thing the crop eats
- Vertical (portrait) photos — they'll be cropped to a thin horizontal band
- Tiny text (< 32 px in the source) — it disappears on phones

### Things to lean into
- Strong central focal point (a hero product, a big "50 % OFF")
- One CTA per image (e.g. "Shop Now")
- Bold colours that contrast with the gray-100 homepage background
- A consistent visual style across the set of promotions so the mosaic feels designed, not assembled

---

## File format & size

| Format | Use when | Notes |
|---|---|---|
| **WebP** | Default choice | ~30 % smaller than JPEG at the same quality. Universal browser support. |
| **JPEG** | Photographic content, no transparency | Quality 80 hits the size targets without visible artefacts. |
| **AVIF** | You have it | Even smaller than WebP. Next.js serves it automatically when supported. |
| **PNG** | Only if you need transparency for graphics | Avoid for photos — files balloon. |

**Targets:**
- Featured tile source: **≤ 400 KB**
- Side tile source: **≤ 200 KB**

The CDN won't re-fetch the original after the first request (cache-control is `immutable`), so go a touch smaller than the budget rather than larger.

### Quick optimisation cheatsheet
- **Squoosh** (squoosh.app): drag image in, choose WebP, quality 75–80, download
- **macOS Preview**: File → Export → Format JPEG → Quality slider to ~75 %
- **Photoshop**: File → Export → Save for Web → JPEG → Quality 60–70
- **ImageOptim** (Mac) / **TinyPNG** (web): drop and re-save

A 2000 × 1250 px JPEG at quality 70 lands around 250 KB — under budget with room to spare.

---

## Examples of promotion content that works

| Content type | What to do | What to avoid |
|---|---|---|
| Site-wide sale ("50 % off everything") | Big bold percentage in the centre, soft product backdrop | Tiny percentage in the corner; busy product collage |
| Single hero product feature | Product centre-frame, price stamp on one side, brand mark small | Multiple products competing for attention |
| Brand-month feature ("Samsung March") | Product on one side, brand logo on the other, both inside the safe zone | Logo touching an edge — it'll vanish on mobile |
| Category callout ("New TVs in stock") | One representative product, a few words of copy in the safe zone | Long sentences — they don't read on a phone in 1 second |
| Time-limited deal ("Ends Sunday") | Countdown / date stamp in the safe zone, product hero | Date stamp in the top-right corner — gets cropped |

---

## Click target ("Link to")

Each promotion can optionally link somewhere. Leave the **Link to** field blank for a display-only banner; fill it in to make the whole tile clickable.

| What you want | Paste this in "Link to" | How it opens |
|---|---|---|
| A specific product | `/products/lg-2-door-top-freezer-18cuft` | Same tab (client-side) |
| A category | `/categories/televisions` | Same tab |
| A brand page | `/brands/samsung` | Same tab |
| Today's deals | `/deals` | Same tab |
| The all-products grid pre-filtered | `/products?category=televisions&on_sale=1` | Same tab |
| A search result | `/search?q=fridge` | Same tab |
| A Facebook event, etc. | `https://facebook.com/events/123…` | New tab |

**Rules the admin enforces** (mirrored in the DB so a stray paste can't escape the storefront):

- Must start with **`/`** (internal path) — or
- Must start with **`http://`** / **`https://`** (full URL) — or
- Must be **empty** (display-only)

Anything else (`mailto:`, `tel:`, `javascript:`, `file:`…) is rejected with an inline error before save.

### Tips

- **Test the path first** by opening it in a browser tab before pasting it. A 404 link on a banner is worse than no link at all.
- **For internal links, omit `https://yoursite.com`** — just use the path. That way the link stays valid if you change domains, and it gets client-side navigation (no full reload).
- **For external links, the new tab is automatic.** You don't need to add anything special — the mosaic adds `target="_blank" rel="noopener noreferrer"` for you.
- **Match the image to the destination.** A "50 % off TVs" banner should land on `/categories/televisions`, not the homepage. Specific is better than broad.

---

## Workflow checklist

Before uploading a promo:

- [ ] Source is at least **2000 px wide** for featured, **1200 px** for side
- [ ] Aspect ratio is **16:10** (featured) or **16:9 / 16:10** (side)
- [ ] All text, logos, and faces are within the **centre 80 %**
- [ ] Saved as **WebP** (preferred) or **JPEG**
- [ ] File size is **under the budget** (400 KB / 200 KB)
- [ ] **Title** in the admin form is a real sentence (used as alt text for screen readers)
- [ ] **Link to** filled in if the banner should be clickable; tested in a browser tab first
- [ ] **Starts at / Ends at** set if the sale is time-bound; left blank if it should run indefinitely
- [ ] **Featured** is checked on exactly one promotion if you want a hero — otherwise the first one wins by default

---

## Reference: where each slot is implemented

For developers tweaking the layout:

- Mosaic component: [src/components/customer/PromotionMosaic.tsx](../src/components/customer/PromotionMosaic.tsx)
- Aspect ratios are set via Tailwind utility classes inline on the `<Tile>` component
- Container width is the `.container` from [tailwind.config.ts](../tailwind.config.ts) (max ~1280 px by default; bump `theme.extend.container.screens` if your design ever changes)
- Image upload goes through the [`uploadPromotionImage`](../src/app/admin/(panel)/promotions/image-actions.ts) server action into the `promotions` Supabase Storage bucket (immutable cache, 5 MB hard limit)
