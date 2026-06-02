-- War on Retail — admin-editable Markdown bodies for long-form pages
--
-- Adds a `body_markdown` column on the existing `page_seo` table and seeds
-- the five long-form pages (/about + four policies) with their current
-- static content converted from JSX → Markdown. Placeholders of the form
-- {{site_name}} / {{site_phone}} / {{site_email}} / {{site_address}} /
-- {{site_whatsapp}} expand at render time from `getStoreSettings()` so
-- contact details stay in sync without the admin editing the body again.
--
-- The `where body_markdown is null` guards on each UPDATE mean re-running
-- this migration after an admin has edited a page won't clobber their work.

alter table public.page_seo
  add column if not exists body_markdown text;

-- ---------------------------------------------------------------------------
-- about
-- ---------------------------------------------------------------------------
update public.page_seo
set body_markdown = $body$# About {{site_name}}

{{site_name}} is Guyana's trusted source for electronics, home appliances, and
everyday tech. We carry leading brands like Samsung, LG, Sony, HP, and many
more — every item authentic and backed by the manufacturer's warranty.

## Why we exist

Buying quality electronics in Guyana shouldn't mean paying a premium for
inconsistent service. We curate a tight, current catalogue, deliver across
the country, and stay available on WhatsApp, phone, and chat for whatever
you need afterwards.

## How to reach us

The fastest channel is WhatsApp:
[+{{site_whatsapp}}](https://wa.me/{{site_whatsapp}}). You can also call us at
[{{site_phone}}](tel:{{site_phone}}) or email
[{{site_email}}](mailto:{{site_email}}).
$body$
where id = 'about' and body_markdown is null;

-- ---------------------------------------------------------------------------
-- policies-privacy
-- ---------------------------------------------------------------------------
update public.page_seo
set body_markdown = $body$# Privacy Policy

This policy explains what data {{site_name}} collects when you visit our
website, how we use it, and what choices you have. We've tried to write it
in plain language rather than legalese — if anything is unclear, please ask.

## What we collect on the website

### Stored on your device (browser storage)

We use your browser's **local storage** — not third-party cookies — to
remember the things that make the site useful:

- **Cart** — the products you've added so you can finish your inquiry later.
- **Wishlist** — products you've saved for later.
- **Recently viewed** — up to ten product pages you've opened recently, surfaced as a strip on the homepage.
- **Compare list** — products you've queued for side-by-side comparison.
- **Chat session ID** — a random identifier the chat assistant uses to group your messages within one session.

All of this stays on your device. We can't read it from our servers, and
clearing your browser's storage removes all of it.

### Sent to our servers

- **Chat conversations.** When you use the chat assistant, your messages and our replies are stored in our database (the random session ID above is attached but no other identifying information is). We use this to improve replies and add new FAQs.
- **Standard server logs.** Like every website, our server records each request (page URL, browser type, IP address, timestamp). These are kept short-term for security and debugging.

### Sent to third parties

- **WhatsApp.** When you click any "Buy via WhatsApp" or "Send inquiry" button, you're handed off to WhatsApp with a pre-filled message. From that point on the conversation is governed by [WhatsApp's privacy policy](https://www.whatsapp.com/legal/privacy-policy).
- **AI provider.** The chat assistant sends your message (and a short excerpt of our FAQs + catalogue) to our AI provider so it can compose a reply. The provider does not retain the content for training.

## What we don't do

- We don't sell your data.
- We don't use third-party tracking or advertising cookies.
- We don't collect payment information on the website — purchases are confirmed by our team on WhatsApp.

## Cookies (the actual HTTP kind)

The only HTTP cookies on the site are **authentication cookies** used by
staff to sign into the admin panel. Customers don't get any tracking
cookies set.

## Your choices

- **Clear your data.** Use your browser's "Clear site data" feature for this site to remove everything stored locally.
- **Delete a chat conversation.** Reply to us on WhatsApp or email us — we can delete records by session ID on request.
- **Opt out of the chat assistant.** Simply don't open the chat widget. The rest of the site works without it.

## Children

Our site is intended for adults. We don't knowingly collect data from anyone
under 16. If you believe a child has provided data to us, contact us and
we'll remove it.

## Changes to this policy

We'll update the "Last updated" date at the bottom of this page whenever
the policy changes. Material changes will be flagged in the cookie notice
at the bottom of the site.
$body$
where id = 'policies-privacy' and body_markdown is null;

-- ---------------------------------------------------------------------------
-- policies-shipping
-- ---------------------------------------------------------------------------
update public.page_seo
set body_markdown = $body$# Shipping & Returns

We deliver across Guyana. Order details, delivery scheduling, and payment
are all confirmed by our team on WhatsApp after you send an inquiry from
the cart.

## Delivery areas & timing

- **Georgetown** — same-day delivery on inquiries received before 2 PM, next business day otherwise.
- **Outside Georgetown** — typically 2–5 business days depending on location and item size. Our team will confirm an exact window when you inquire.
- **Heavy items** (refrigerators, large TVs, washing machines) — scheduled by appointment so someone's available to receive them.

## Delivery fees

**Free delivery within Georgetown** on orders over GYD $20,000. Smaller
orders within Georgetown, and all out-of-town deliveries, have a fee that
depends on location, weight, and item size. We quote this with your inquiry
— no hidden charges.

## Payment

We accept **cash on delivery**, **bank transfer**, and **major debit and
credit cards**. Mobile-money options are being added — ask our team for
the latest.

## Returns

You can return most items **within 7 days of delivery** if they are:

- Unused and in their original condition
- In their original packaging with all accessories and manuals
- Accompanied by proof of purchase (WhatsApp message thread, receipt, or invoice)

To start a return, message us on WhatsApp at
[+{{site_whatsapp}}](https://wa.me/{{site_whatsapp}}) with your order
details. We'll arrange pickup or drop-off and confirm the refund or exchange.

## Exchanges

Exchanges follow the same 7-day window. You can exchange for a different
size, colour, or model — the price difference (either way) is settled at
the time of exchange.

## What can't be returned

- **Software / digital activations** — once a licence key is provided, it's non-refundable.
- **Items damaged by use** — accidental damage, water damage, dropped items. These can sometimes be repaired under warranty — see our [warranty policy](/policies/warranty).
- **Hygiene items** (earbuds, headphones once worn) — unless unopened.

## Defective on arrival

If an item arrives defective or doesn't power on, contact us within 48
hours and we'll replace it at no extra cost. Photos help speed this up —
please include them in your WhatsApp message.
$body$
where id = 'policies-shipping' and body_markdown is null;

-- ---------------------------------------------------------------------------
-- policies-terms
-- ---------------------------------------------------------------------------
update public.page_seo
set body_markdown = $body$# Terms of Service

These terms cover your use of the {{site_name}} website and the inquiry
process that follows. By browsing, adding items to a cart, or sending us a
WhatsApp inquiry from this site, you agree to these terms.

## About us

{{site_name}} is an electronics and home-appliance retailer based in
{{site_address}}. You can reach us at
[{{site_phone}}](tel:{{site_phone}}) or by emailing
[{{site_email}}](mailto:{{site_email}}).

## How the site works

Prices and stock displayed on the website are **indicative**. We confirm
final pricing, availability, and delivery details with you on WhatsApp
before any purchase is finalised. Until that confirmation happens, no sale
has taken place — the cart is an inquiry list, not an order.

## Pricing & currency

All prices are in **Guyanese Dollars (GYD)**. We try to keep prices on the
site current, but in the event of a discrepancy, the price quoted by our
team on WhatsApp at the time of confirmation is the price that applies. If
a quoted price ever diverges materially from the displayed price, we'll
explain why before asking you to proceed.

## Product information

We do our best to describe products accurately, including specs and images.
Images may differ slightly from the actual product (colour, packaging
variants). Specifications and feature sets ultimately come from the
manufacturer — we link to brand pages where useful.

## Inquiries & sales

- Sending an inquiry from the cart is not a binding order. We confirm price, stock, and delivery before either party commits.
- We reserve the right to decline or cancel an inquiry — for example, if a price is clearly an error, or if stock is unexpectedly unavailable.
- Refunds, returns, and warranty claims are covered under our separate [Shipping & Returns](/policies/shipping) and [Warranty](/policies/warranty) policies.

## Acceptable use

You agree not to:

- Use the site to send unsolicited commercial messages
- Attempt to bypass security controls, scrape large portions of the catalogue programmatically, or interfere with normal operation
- Impersonate another person or business in chats or inquiries
- Use the chat assistant for purposes other than asking about our products and services

## User-generated content

Anything you submit through the chat assistant or via inquiries (including
questions, photos sent in a WhatsApp chat) is treated as confidential
between you and our team. See our [Privacy Policy](/policies/privacy) for
how chat content is stored.

## Intellectual property

The {{site_name}} brand, logo, and site design are our property. Product
names, logos, and images belong to their respective manufacturers and are
used to describe and sell legitimate products.

## Liability

We provide the site and its content "as is". To the maximum extent permitted
by law, we're not liable for indirect or consequential losses arising from
your use of the site (such as data loss or business interruption). Nothing
in these terms limits our responsibility for defective products, which is
covered by the warranty and consumer protection law.

## Changes to these terms

We may update these terms occasionally. Changes take effect from the "Last
updated" date at the bottom of the page. Continuing to use the site after a
change means you accept the updated terms.

## Governing law

These terms are governed by the laws of the Co-operative Republic of Guyana.
Any dispute that can't be resolved directly between us is subject to the
jurisdiction of the Guyanese courts.
$body$
where id = 'policies-terms' and body_markdown is null;

-- ---------------------------------------------------------------------------
-- policies-warranty
-- ---------------------------------------------------------------------------
update public.page_seo
set body_markdown = $body$# Warranty

Every product we sell is authentic and carries its **manufacturer warranty**.
Warranty length varies by product and brand — the specific term is printed
on each product page and on the receipt you receive at delivery.

## Typical warranty periods

- **Televisions** — 1 year on parts and labour; panel-only warranties vary by brand
- **Refrigerators & large appliances** — 1 year general; compressor warranties of 5–10 years from major brands (LG, Samsung, Whirlpool)
- **Kitchen appliances** — 1 year
- **Laptops & computing** — 1 year manufacturer warranty (extendable via the brand's own programmes)
- **Personal-care items** — 6 months to 1 year depending on the product
- **Accessories** (cables, chargers, small electronics) — 30 days

## What the warranty covers

- Defects in materials and workmanship
- Component failures that occur under normal use
- Replacement of defective parts or, where parts aren't available, the unit itself

## What it doesn't cover

- Accidental damage (drops, spills, impact)
- Power-surge damage from sources outside the unit's protection range
- Wear-and-tear cosmetic damage (scratches, scuffs)
- Damage from unauthorised repairs or modifications
- Lost remotes, manuals, or accessories

## How to make a claim

1. Message us on WhatsApp at [+{{site_whatsapp}}](https://wa.me/{{site_whatsapp}}) with the product name, the date of purchase, and a description of the issue. Photos or a short video help us diagnose faster.
2. We'll confirm whether the issue is covered and arrange either an in-house repair, a dispatch to the brand's authorised service centre, or a replacement.
3. For larger appliances, we can usually arrange in-home assessment within Georgetown.

## Turn-around times

Most warranty claims resolve within **7–14 business days**. Brand-specific
service centres (especially for laptops and TVs) sometimes take longer;
we'll keep you updated on WhatsApp throughout.

## Proof of purchase

Keep your WhatsApp message thread, receipt, or invoice. Any of these works
as proof of purchase — we don't require a paper card.
$body$
where id = 'policies-warranty' and body_markdown is null;
