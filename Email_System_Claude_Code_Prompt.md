# EMAIL NOTIFICATION SYSTEM IMPLEMENTATION PROMPT
## War on Retail - Claude Code + Resend Integration

---

## COPY THIS ENTIRE PROMPT INTO CLAUDE CODE

```
You are an expert Node.js/TypeScript developer building an email notification 
system for War on Retail e-commerce platform.

TASK: Create a complete, production-ready email notification service using Resend 
email provider.

PROJECT SETUP:
- Runtime: Node.js 18+
- Language: TypeScript
- Email Service: Resend (https://resend.com)
- Framework: Express.js for API routes
- Database: Supabase (optional, for email templates)
- Environment: .env file for secrets

RESEND SETUP:
- API Key: Process from environment variable RESEND_API_KEY
- Sender Email: noreply@waronretail.com
- Reply-to: support@waronretail.com
- Domain: Already verified in Resend (assumed)

RESEND API BASICS (What you'll use):
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

// Send email
resend.emails.send({
  from: 'noreply@waronretail.com',
  to: 'customer@example.com',
  subject: 'Order Confirmation',
  html: '<h1>Your order is confirmed!</h1>',
  replyTo: 'support@waronretail.com',
});

// With React component
resend.emails.send({
  from: 'noreply@waronretail.com',
  to: recipient,
  subject: 'Order Confirmation',
  react: <OrderConfirmationEmail order={order} />,
});
```

FEATURE REQUIREMENTS:

1. EMAIL TEMPLATE COMPONENTS (React)
   - OrderConfirmationEmail
   - ShipmentNotificationEmail
   - DeliveryConfirmationEmail
   - AbandonedCartEmail
   - WelcomeEmail
   - PriceDropEmail
   - BackInStockEmail

2. EMAIL SERVICE MODULE
   - sendOrderConfirmation(customer, order)
   - sendShipmentNotification(customer, order, tracking)
   - sendDeliveryConfirmation(customer, order)
   - sendAbandonedCart(customer, cartItems, total)
   - sendWelcomeEmail(customer, discountCode?)
   - sendPriceDropAlert(customer, product, oldPrice, newPrice)
   - sendBackInStockAlert(customer, product)
   - All with error handling and logging

3. TYPE DEFINITIONS
   - EmailTemplate type
   - Customer interface
   - Order interface
   - CartItem interface
   - EmailResponse type
   - EmailError type

4. QUEUE SYSTEM (Optional but recommended)
   - Bull Queue for processing emails
   - Retry logic (3 attempts)
   - Failed email tracking
   - Email history logging

5. API ENDPOINTS (Express)
   - POST /api/emails/send (generic)
   - POST /api/emails/order-confirmation
   - POST /api/emails/shipment
   - POST /api/emails/delivery
   - POST /api/emails/abandoned-cart
   - POST /api/emails/welcome
   - POST /api/emails/price-drop
   - POST /api/emails/back-in-stock
   - GET /api/emails/status/:id (check delivery status)
   - GET /api/emails/logs (admin: view sent emails)

6. EMAIL TEMPLATES (React Components with Tailwind)
   - Professional design
   - Responsive (mobile-friendly)
   - Brand colors: #DC2626 (red), #1F2937 (dark gray)
   - Clear CTAs (Call to Action buttons)
   - Company branding
   - Unsubscribe footer
   - Company address footer

SPECIFIC EMAIL TEMPLATES NEEDED:

1. ORDER CONFIRMATION EMAIL
   Props:
   - customer: { name, email }
   - order: { id, items[], subtotal, shipping, tax, total, 
              deliveryAddress, estimatedDeliveryDate }
   Content:
   - Order number prominently displayed
   - Order summary table (product, qty, price)
   - Totals breakdown
   - Delivery address
   - Estimated delivery date
   - "Track Order" button
   - Contact support link
   - Unsubscribe link

2. SHIPMENT NOTIFICATION EMAIL
   Props:
   - customer: { name, email }
   - order: { id, items }
   - tracking: { carrier, number, estimatedDelivery }
   Content:
   - Order is shipped message
   - Carrier name and tracking number (clickable)
   - Estimated delivery date
   - What to expect
   - "Track Package" button (links to carrier)
   - Contact support

3. ABANDONED CART EMAIL
   Props:
   - customer: { name, email }
   - cartItems: [{ name, price, quantity, image }]
   - cartTotal: number
   - discountCode?: string
   - discountPercent?: number
   Content:
   - "Don't forget" headline
   - Cart items with images
   - Total price
   - Discount code (if applicable)
   - "Complete Purchase" button
   - Urgency messaging
   - Expiration date (if limited time)

4. WELCOME EMAIL
   Props:
   - customer: { name, email }
   - discountCode?: string
   - discountPercent?: number
   - expirationDate?: string
   Content:
   - Welcome message
   - Discount code (if applicable)
   - "Start Shopping" button
   - Featured products
   - Company story/value proposition
   - Social media links

5. PRICE DROP EMAIL
   Props:
   - customer: { name, email }
   - product: { name, image, url }
   - oldPrice: number
   - newPrice: number
   - savingsAmount: number
   - savingsPercent: number
   Content:
   - Product image
   - Product name
   - Price comparison (old → new)
   - Savings amount and percentage
   - "Buy Now" button
   - Limited time message (if applicable)
   - Similar products (if applicable)

6. BACK IN STOCK EMAIL
   Props:
   - customer: { name, email }
   - product: { name, image, url }
   - stockQuantity: number
   - currentPrice: number
   Content:
   - "Just restocked" badge
   - Product image
   - Product name
   - Current price
   - Stock level (if low)
   - "Shop Now" button
   - Similar products

IMPLEMENTATION REQUIREMENTS:

CODE STRUCTURE:
```
src/
├── emails/
│   ├── templates/
│   │   ├── OrderConfirmation.tsx
│   │   ├── ShipmentNotification.tsx
│   │   ├── DeliveryConfirmation.tsx
│   │   ├── AbandonedCart.tsx
│   │   ├── Welcome.tsx
│   │   ├── PriceDrop.tsx
│   │   ├── BackInStock.tsx
│   │   └── Layout.tsx (shared layout)
│   ├── service.ts (main email service)
│   ├── types.ts (TypeScript definitions)
│   └── queue.ts (optional: Bull queue setup)
├── api/
│   └── emails/
│       ├── route.ts (main send endpoint)
│       ├── order-confirmation.ts
│       ├── shipment.ts
│       ├── delivery.ts
│       ├── abandoned-cart.ts
│       ├── welcome.ts
│       ├── price-drop.ts
│       ├── back-in-stock.ts
│       ├── status.ts
│       └── logs.ts
├── lib/
│   ├── resend.ts (Resend client)
│   └── email-utils.ts (helper functions)
├── .env.local (secrets)
└── types.ts (global types)
```

MUST INCLUDE:

1. Error Handling
   - Try-catch blocks for all email sends
   - Graceful failure handling
   - Error logging to console/database
   - Fallback notifications

2. Logging
   - Log all email sends (to console and database)
   - Include: timestamp, recipient, template, status
   - Track delivery status from Resend webhooks
   - Store email history for admin viewing

3. Input Validation
   - Validate email addresses before sending
   - Validate all required fields
   - Type checking with TypeScript
   - Clear error messages

4. Resend Integration
   - Use Resend client properly
   - Handle Resend API responses
   - Extract message IDs for tracking
   - Handle rate limiting (100/sec)
   - Use Resend webhooks for delivery tracking

5. React Email Components
   - Use @react-email/components library
   - Responsive design (mobile-first)
   - Tailwind CSS for styling
   - Proper spacing and typography
   - Brand consistency
   - Clear CTAs with proper button styling

6. Type Safety
   - Full TypeScript throughout
   - No 'any' types
   - Proper interface definitions
   - Union types for email types
   - Generic function signatures

TESTING REQUIREMENTS:

Include test cases for:
- Sending order confirmation email
- Sending shipment notification email
- Sending abandoned cart email (3-wave sequence)
- Sending welcome email
- Sending price drop alert
- Sending back in stock alert
- Error handling when email send fails
- Validation of email addresses
- Proper error messages
- Email logging

OPTIONAL BUT RECOMMENDED:

1. Email Template Preview
   - /emails/preview endpoint
   - Show all templates with sample data
   - Mobile and desktop preview

2. Email History
   - /api/emails/logs endpoint
   - Filter by date, recipient, type
   - View delivery status
   - Admin dashboard

3. Webhook Integration
   - Handle Resend delivery webhooks
   - Update email status in database
   - Track bounces and complaints

4. Unsubscribe Management
   - Unsubscribe link in all marketing emails
   - Track unsubscribed emails
   - Don't send to unsubscribed

5. Email Scheduling
   - Queue emails for later sending
   - Send abandoned cart emails at specific times
   - Send newsletters on schedule

ENVIRONMENT VARIABLES NEEDED:

```env
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Email Configuration
EMAIL_FROM=noreply@waronretail.com
EMAIL_REPLY_TO=support@waronretail.com
SITE_URL=http://localhost:3000

# Optional: Database
DATABASE_URL=postgresql://...

# Optional: Email Queue
REDIS_URL=redis://...
```

CODE QUALITY REQUIREMENTS:

- ✅ Full TypeScript with strict mode
- ✅ Comprehensive error handling
- ✅ Proper logging
- ✅ Input validation
- ✅ Clean, readable code
- ✅ Comments on complex logic
- ✅ Modular and reusable
- ✅ Testing ready
- ✅ Production ready
- ✅ No console.log (use proper logger)

DELIVERABLES:

1. Complete email service module with all functions
2. 7 React email templates
3. Express API endpoints for sending emails
4. Type definitions
5. Integration instructions
6. Example usage code
7. Testing examples
8. README with setup instructions
9. Environment setup guide
10. Resend configuration guide

EXAMPLE USAGE:

```typescript
import { sendOrderConfirmation, sendAbandonedCart } from '@/emails/service';

// Send order confirmation
await sendOrderConfirmation({
  customer: { name: 'John Doe', email: 'john@example.com' },
  order: {
    id: 'ORD-123',
    items: [{ name: 'Samsung TV', quantity: 1, price: 599 }],
    subtotal: 599,
    shipping: 20,
    tax: 48,
    total: 667,
    deliveryAddress: '123 Main St, Georgetown, GY',
    estimatedDeliveryDate: '2024-01-15'
  }
});

// Send abandoned cart (in a sequence)
await sendAbandonedCart({
  customer: { name: 'Jane Smith', email: 'jane@example.com' },
  cartItems: [
    { name: 'Samsung TV', price: 599, quantity: 1, image: 'url...' },
    { name: 'Wall Mount', price: 45, quantity: 1, image: 'url...' }
  ],
  cartTotal: 644,
  discountCode: 'COMPLETE10',
  discountPercent: 10
});
```

ADDITIONAL NOTES:

- Use Resend's React email components for best results
- Resend handles HTML/CSS optimization automatically
- All templates should be responsive and mobile-friendly
- Include proper unsubscribe mechanism in marketing emails
- Test all emails before deploying
- Monitor Resend dashboard for delivery status
- Set up webhooks for bounce/complaint tracking
- Implement rate limiting to respect Resend API limits

OUTPUT FORMAT:

Generate production-ready, copy-paste code with:
1. Full TypeScript implementation
2. All 10 email templates
3. Complete API endpoints
4. Type definitions
5. Error handling
6. Logging setup
7. Integration instructions
8. Example requests/responses
9. Deployment instructions
10. Troubleshooting guide

Make code immediately usable without modifications (except environment variables).
```

---

## HOW TO USE THIS PROMPT

### Option 1: Use with Claude Code (Recommended)
```
1. Open Claude Code IDE
2. Create new project: "war-on-retail-emails"
3. Copy the entire prompt above
4. Paste into Claude Code
5. Wait for implementation
6. Review generated code
7. Copy files to your project
```

### Option 2: Use with Claude Web
```
1. Go to https://claude.ai
2. Click "New Chat"
3. Copy the prompt
4. Paste into chat
5. Request: "Generate as files I can download"
6. Download generated code
7. Add to your project
```

### Option 3: Use with Claude API
```
1. Call Claude API with the prompt
2. Set temperature: 0.7 (consistent output)
3. Set max_tokens: 8000+
4. Extract generated code from response
5. Save to files in your project
```

---

## EXPECTED OUTPUT FROM CLAUDE CODE

Claude will generate:

### **File 1: src/types/email.ts**
```typescript
// All TypeScript type definitions
- EmailTemplate type
- Customer interface
- Order interface
- CartItem interface
- EmailResponse type
- EmailError type
- Etc.
```

### **File 2: src/lib/resend.ts**
```typescript
// Resend client initialization
import { Resend } from 'resend';
export const resend = new Resend(process.env.RESEND_API_KEY);
```

### **File 3: src/emails/templates/OrderConfirmation.tsx**
```typescript
// React component for order confirmation email
// Uses @react-email/components
// Fully responsive
// With Tailwind styling
```

### **File 4: src/emails/templates/AbandonedCart.tsx**
```typescript
// React component for abandoned cart
```

### **File 5: src/emails/templates/Welcome.tsx**
```typescript
// React component for welcome email
```

### Files 6-8: Other Email Templates
```typescript
- ShipmentNotification.tsx
- DeliveryConfirmation.tsx
- PriceDrop.tsx
- BackInStock.tsx
```

### **File 9: src/emails/service.ts**
```typescript
// Main email service with all send functions
import { resend } from '@/lib/resend';
import OrderConfirmationEmail from './templates/OrderConfirmation';
import AbandonedCartEmail from './templates/AbandonedCart';
// ... imports all templates

export async function sendOrderConfirmation(params) {
  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: params.customer.email,
      subject: `Order Confirmed - #${params.order.id}`,
      react: <OrderConfirmationEmail {...params} />,
      replyTo: process.env.EMAIL_REPLY_TO,
    });
    
    console.log(`[EMAIL] Order confirmation sent to ${params.customer.email}`);
    return data;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send order confirmation:`, error);
    throw error;
  }
}

// ... All other email functions
```

### **File 12: src/api/emails/route.ts**
```typescript
// Main Express API endpoint
import { sendOrderConfirmation, sendAbandonedCart } from '@/emails/service';

export async function POST(request: Request) {
  const { type, payload } = await request.json();
  
  switch (type) {
    case 'order-confirmation':
      return await sendOrderConfirmation(payload);
    case 'abandoned-cart':
      return await sendAbandonedCart(payload);
    // ... all other types
    
    default:
      return Response.json({ error: 'Unknown email type' }, { status: 400 });
  }
}
```

### Plus all other API endpoints, utilities, and configuration files...

---

## QUICK INTEGRATION STEPS

### Step 1: Install Dependencies
```bash
npm install resend @react-email/components next
```

### Step 2: Get Resend API Key
```
1. Go to https://resend.com
2. Sign up (free account)
3. Create API key
4. Copy to .env.local
```

### Step 3: Add Environment Variables
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@waronretail.com
EMAIL_REPLY_TO=support@waronretail.com
SITE_URL=http://localhost:3000
```

### Step 4: Copy Generated Files
```
Copy all files from Claude Code output
→ Paste into src/ directory
→ Keep folder structure intact
```

### Step 5: Use in Your App
```typescript
import { sendOrderConfirmation } from '@/emails/service';

// When order is placed:
await sendOrderConfirmation({
  customer: { name: 'John', email: 'john@example.com' },
  order: orderData
});
```

### Step 6: Test
```bash
npm run dev
# Visit http://localhost:3000/api/emails/preview
# to see all email templates
```

---

## WHAT YOU'LL GET

✅ **7 Complete Email Templates**
- Beautiful, responsive design
- Tailwind CSS styling
- Mobile-friendly
- Brand-aligned

✅ **Email Service Module**
- All 7 email sending functions
- Error handling
- Logging
- Type-safe

✅ **API Endpoints**
- Send any email via API
- Check delivery status
- View email logs
- Admin access

✅ **Production Ready**
- Full TypeScript
- Proper error handling
- Input validation
- Security best practices

✅ **Easy Integration**
- Copy-paste functions
- Clear documentation
- Example usage
- Testing ready

---

## COST & BENEFITS

### Cost:
```
Resend Free Tier:
- 100 emails/day free
- Pay-as-you-go after ($0.20 per 100 emails)
- For 100K emails/month: ~$20

Setup time: 30 minutes
Implementation time: 1 hour
Total: 1.5 hours to full email system
```

### Benefits:
```
✅ Professional email delivery
✅ Beautiful, responsive templates
✅ Delivery tracking
✅ Webhook integration
✅ Scalable to millions of emails
✅ Best-in-class deliverability
✅ Easy to use and maintain
```

---

**Everything you need to implement a complete email notification system!** 🚀

Copy the prompt above, paste into Claude Code, and get production-ready email implementation in minutes.
