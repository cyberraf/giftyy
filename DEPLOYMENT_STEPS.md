# QR Card System Deployment Steps

## 1. Deploy Database Migration

Run the migration in your Supabase SQL Editor:

```bash
# Copy the contents of supabase-migrations-giftyy-cards.sql
# and paste into Supabase SQL Editor, then execute
```

Or if using Supabase CLI:
```bash
supabase db push
```

**Verify:**
- Check that `giftyy_card_status` enum exists
- Check that `giftyy_cards` table exists
- Check that RLS policies are active

## 2. Deploy Edge Function

```bash
cd supabase/functions
supabase functions deploy activate-qr-card
```

**Verify:**
```bash
supabase functions list
```

## 3. Seed Initial QR Card Inventory

Create and run a seeding script to generate initial QR cards:

**Option A: Via SQL (for small batch)**
```sql
-- Generate 100 QR cards with unique public tokens
INSERT INTO public.giftyy_cards (public_token, status)
SELECT 
    'GFT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    'inactive'::giftyy_card_status
FROM generate_series(1, 100);
```

**Option B: Via Script (for large batch with custom tokens)**
See `scripts/seed-qr-cards.ts`

## 4. Update Buyer Frontend (Already Done ✅)

- Orders now created with `awaiting_qr_assignment` status
- No QR codes generated at checkout
- Buyers see "Your gift is being prepared" message

## 5. Create Vendor QR Assignment UI (TODO)

Create vendor interface to:
- View orders awaiting QR assignment
- Scan/input QR card public token
- Call `activate-qr-card` edge function (2-step process)
- View assigned QR cards

**Sample vendor flow:**
```typescript
// Step 1: Reserve QR card
const reserveResponse = await supabase.functions.invoke('activate-qr-card', {
  body: {
    orderId: selectedOrder.id,
    qrPublicToken: scannedToken,
    finalize: false
  }
});

// Step 2: Confirm and finalize
const finalizeResponse = await supabase.functions.invoke('activate-qr-card', {
  body: {
    orderId: selectedOrder.id,
    qrPublicToken: scannedToken,
    finalize: true
  }
});
```

## 6. Create/Update Recipient Scan Endpoint

Create endpoint to handle recipient QR scans:

**Endpoint: `GET /gift/:publicToken`**

```typescript
// Lookup QR card by public_token
const { data: qrCard } = await supabase
  .from('giftyy_cards')
  .select('*, orders(*)')
  .eq('public_token', publicToken)
  .eq('status', 'active')
  .single();

if (!qrCard) {
  // Show "QR card not activated yet" or "Invalid QR code"
  return;
}

// Display order, video message, celebration wall
const order = qrCard.orders;
// ... render gift experience
```

## 7. Testing Checklist

### Database
- [ ] Migration runs successfully
- [ ] Enum type created
- [ ] Table created with correct schema
- [ ] RLS policies active
- [ ] Constraints working (unique, check, etc.)

### Edge Function
- [ ] Function deploys successfully
- [ ] Function appears in functions list
- [ ] Reserve step works (finalize: false)
- [ ] Finalize step works (finalize: true)
- [ ] Validation errors work correctly
- [ ] Authentication checks work

### Order Flow
- [ ] New orders created with `awaiting_qr_assignment` status
- [ ] No QR codes auto-generated at checkout
- [ ] Order visible to vendor
- [ ] Vendor can activate QR card
- [ ] Order status updates to `qr_assigned`
- [ ] QR card status updates to `active`

### QR Card Lifecycle
- [ ] QR card starts as `inactive`
- [ ] Moves to `pending_activation` on reserve
- [ ] Moves to `active` on finalize
- [ ] Cannot be reassigned once `active`
- [ ] Recipient can scan and view gift

### Error Handling
- [ ] Invalid order ID rejected
- [ ] Invalid QR token rejected
- [ ] Already assigned cards rejected
- [ ] Wrong order status rejected
- [ ] Vendor without access rejected

## 8. Monitoring

After deployment, monitor:
- Edge function logs: `supabase functions logs activate-qr-card`
- Database queries performance
- Failed activation attempts
- Orphaned pending activations (stuck in `pending_activation`)

## 9. Future Enhancements

- [ ] Bulk QR card generation tool
- [ ] QR card inventory dashboard
- [ ] Auto-expiry for pending activations (cron job)
- [ ] QR card reprint functionality
- [ ] Analytics on QR scan rates
- [ ] Vendor QR card request system

