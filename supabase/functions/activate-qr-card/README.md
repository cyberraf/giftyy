# Activate QR Card Edge Function

## Overview
This edge function allows vendors to activate physical QR cards and bind them to orders. The activation process is two-step to ensure proper validation and prevent race conditions.

## Endpoint
`POST /functions/v1/activate-qr-card`

## Authentication
Requires vendor authentication via Bearer token in Authorization header.

## Request Body
```json
{
  "orderId": "uuid-of-order",
  "qrPublicToken": "public-token-from-qr-card",
  "finalize": false  // Optional: true to finalize, false to reserve (default: false)
}
```

## Activation Flow

### Step 1: Reserve (finalize: false)
- Validates order exists and status is `awaiting_qr_assignment`
- Validates QR card exists and status is `inactive`
- Validates vendor has access to the order (order contains vendor's products)
- Sets QR card status to `pending_activation`
- Sets `pending_order_id` to the order ID
- Sets `activated_by_vendor_id` to the vendor ID

**Response:**
```json
{
  "success": true,
  "message": "QR card reserved for activation",
  "qrCardId": "uuid",
  "orderId": "uuid",
  "nextStep": "Call again with finalize=true to complete activation"
}
```

### Step 2: Finalize (finalize: true)
- Validates QR card status is `pending_activation`
- Validates `pending_order_id` matches the provided order ID
- Sets QR card status to `active`
- Sets `assigned_order_id` to the order ID (permanent binding)
- Sets `activated_at` timestamp
- Clears `pending_order_id`
- Updates order status to `qr_assigned`

**Response:**
```json
{
  "success": true,
  "message": "QR card activated and order status updated",
  "qrCardId": "uuid",
  "orderId": "uuid"
}
```

## Error Responses

### 400 Bad Request
- Missing required fields
- Invalid order status
- Invalid QR card status
- QR card already assigned

### 401 Unauthorized
- Missing or invalid authentication token

### 403 Forbidden
- User is not a vendor
- Vendor does not have access to the order

### 404 Not Found
- Order not found
- QR card not found

### 409 Conflict
- QR card already assigned to another order
- Order/QR card status mismatch

### 500 Internal Server Error
- Database errors
- Unexpected errors

## Security Guarantees
1. Only vendors can activate QR cards
2. Vendors can only activate QR cards for orders containing their products
3. Once a QR card is active, it cannot be reassigned
4. Orders must be in `awaiting_qr_assignment` status to be activated
5. QR cards must be `inactive` to start activation

## Usage Example

```javascript
// Step 1: Reserve
const reserveResponse = await fetch('https://your-project.supabase.co/functions/v1/activate-qr-card', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${vendorToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    orderId: 'order-uuid',
    qrPublicToken: 'qr-public-token',
    finalize: false
  })
});

// Step 2: Finalize (after confirming)
const finalizeResponse = await fetch('https://your-project.supabase.co/functions/v1/activate-qr-card', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${vendorToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    orderId: 'order-uuid',
    qrPublicToken: 'qr-public-token',
    finalize: true
  })
});
```

