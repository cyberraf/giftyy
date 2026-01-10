# QR Card Architecture Refactor Plan

## Overview
Refactor order creation and QR handling to use pre-generated physical QR cards that vendors assign to orders, instead of auto-generating QR codes at checkout.

## Goals
1. Orders created with `awaiting_qr_assignment` status (no QR codes)
2. New `giftyy_cards` table for physical QR card inventory
3. Vendor activation endpoint to bind QR cards to orders
4. Recipient scanning uses `public_token` to look up active QR cards

## Implementation Steps

### 1. Update Order Status Types

**File: `contexts/OrdersContext.tsx`**

Update `OrderStatus` type to include new statuses:
- Add `'awaiting_qr_assignment'` 
- Add `'qr_assigned'`
- Keep existing statuses: `'processing'`, `'confirmed'`, `'shipped'`, `'out_for_delivery'`, `'delivered'`, `'cancelled'`

### 2. Change Order Creation Status

**File: `contexts/OrdersContext.tsx`**

In `createOrder` function (line ~228), change:
```typescript
status: 'processing',
```
to:
```typescript
status: 'awaiting_qr_assignment',
```

### 3. Create Giftyy Cards Migration

**New File: `supabase-migrations-giftyy-cards.sql`**

Create new table `giftyy_cards` with:
- `id` (UUID, primary key)
- `public_token` (TEXT, unique, indexed) - used in QR URL for scanning
- `status` (TEXT, enum: 'inactive' | 'pending_activation' | 'active')
- `assigned_order_id` (UUID, nullable, references orders.id)
- `pending_order_id` (UUID, nullable) - temporary assignment during activation flow
- `activated_by_vendor_id` (UUID, nullable, references profiles.id)
- `activated_at` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ, default now())
- `updated_at` (TIMESTAMPTZ, default now())

Constraints:
- Unique index on `public_token`
- Unique index on `assigned_order_id` WHERE `assigned_order_id IS NOT NULL` (one card per order)
- Check constraint: `status = 'active'` requires `assigned_order_id IS NOT NULL`
- Check constraint: once `status = 'active'`, cannot change `assigned_order_id`
- RLS policies for vendors/admins

### 4. Create Vendor QR Activation Edge Function

**New File: `supabase/functions/activate-qr-card/index.ts`**

Edge function for vendors to activate QR cards:

**Input:**
```typescript
{
  orderId: string;
  qrPublicToken: string;
}
```

**Validation:**
1. Order exists and `status = 'awaiting_qr_assignment'`
2. QR card exists with `public_token = qrPublicToken`
3. QR card `status = 'inactive'`
4. Vendor is authenticated and has access to the order (via products)

**Activation Flow (Two-Step):**

**Step 1 - Reserve (pending_activation):**
- Set `giftyy_cards.status = 'pending_activation'`
- Set `giftyy_cards.pending_order_id = orderId`
- Set `giftyy_cards.activated_by_vendor_id = vendorId`
- Return success with confirmation

**Step 2 - Finalize (active):**
- Validate: `status = 'pending_activation'` and `pending_order_id = orderId`
- Set `giftyy_cards.status = 'active'`
- Set `giftyy_cards.assigned_order_id = orderId`
- Set `giftyy_cards.activated_at = NOW()`
- Clear `giftyy_cards.pending_order_id`
- Update `orders.status = 'qr_assigned'`
- Return success

**Alternative (One-Step):**
- If preferred, combine into single atomic operation:
  - Use database transaction
  - Validate all conditions
  - Update both `giftyy_cards` and `orders` in transaction
  - Ensure atomicity

**Error Handling:**
- Return appropriate HTTP status codes (400 for validation errors, 404 for not found, 403 for unauthorized, 409 for conflicts)
- Prevent reassignment of active cards
- Prevent activation of cards already assigned

### 5. Update Recipient Scan Flow

**If recipient scan endpoint exists, update it:**

Lookup by `public_token` instead of order_id:
1. Find `giftyy_cards` by `public_token`
2. Validate `status = 'active'`
3. Resolve `assigned_order_id` to get order
4. Return order and video message data

If no recipient scan endpoint exists yet, this can be implemented later.

### 6. Optional: Update Order QR Codes Table

**File: `supabase-migrations-order-qr-codes.sql`**

**Option A:** Deprecate/keep for backwards compatibility
**Option B:** Migrate to reference `giftyy_cards` instead

For now, we'll leave it as-is since it may be used for different purposes.

## Database Schema Summary

### giftyy_cards table
```sql
CREATE TABLE giftyy_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('inactive', 'pending_activation', 'active')),
  assigned_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  pending_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  activated_by_vendor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT active_card_has_order CHECK (
    (status = 'active' AND assigned_order_id IS NOT NULL) OR
    status != 'active'
  )
);

CREATE UNIQUE INDEX idx_giftyy_cards_public_token ON giftyy_cards(public_token);
CREATE UNIQUE INDEX idx_giftyy_cards_assigned_order ON giftyy_cards(assigned_order_id) WHERE assigned_order_id IS NOT NULL;
CREATE INDEX idx_giftyy_cards_status ON giftyy_cards(status);
CREATE INDEX idx_giftyy_cards_vendor ON giftyy_cards(activated_by_vendor_id);
```

## Order Status Flow

```
awaiting_qr_assignment → qr_assigned → confirmed → shipped → out_for_delivery → delivered
                                              ↓
                                         cancelled
```

## System Guarantees

1. ✅ One QR card → one order (forever) - enforced by unique constraint
2. ✅ Orders cannot move to `qr_assigned` without vendor action - enforced by activation endpoint
3. ✅ Buyers never see QR logistics - no UI changes needed
4. ✅ Vendors cannot reuse QR cards - enforced by status checks and constraints

