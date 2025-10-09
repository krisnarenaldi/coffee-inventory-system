# Database Changes Required for Upgrade Fix

## Option 1: Account Credit System (Recommended)

### New Table Required: `account_credits`

Add this to your `prisma/schema.prisma`:

```prisma
model AccountCredit {
  id          String   @id @default(cuid())
  tenantId    String
  amount      Decimal  @db.Decimal(10,2)
  currency    String   @default("IDR")
  reason      String
  status      String   @default("ACTIVE") // ACTIVE, USED, EXPIRED
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  metadata    Json?
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  
  @@map("account_credits")
}
```

### Update Tenant Model:
```prisma
model Tenant {
  // ... existing fields ...
  accountCredits AccountCredit[]
}
```

## Option 2: Extend Subscription (No New Tables)

### Uses Existing Tables:
- ✅ `Subscription` table (just update `currentPeriodEnd`)
- ✅ `Transaction` table (add record for tracking)

## Option 3: Enhanced Upgrade Logic (Minimal Changes)

### Update Existing Tables:

#### 1. Add to `Subscription` table:
```prisma
model Subscription {
  // ... existing fields ...
  intendedPlan     String?   // For scheduled upgrades
  upgradeScheduledFor DateTime? // When upgrade should activate
}
```

#### 2. Update `Transaction` table:
```prisma
model Transaction {
  // ... existing fields ...
  metadata Json? // Already exists - just use it more
}
```

#### 3. Add new enum values (if needed):
```prisma
enum TransactionStatus {
  PENDING
  PAID
  FAILED
  CANCELLED
  EXPIRED
  REFUNDED
  SCHEDULED  // Add this for scheduled upgrades
}
```

## Migration Commands

### For Account Credit System:
```bash
# Add the new model to schema.prisma first, then:
npx prisma db push
# or
npx prisma migrate dev --name add-account-credits
```

### For Enhanced Upgrade Logic:
```bash
# Add the new fields to schema.prisma first, then:
npx prisma db push
# or  
npx prisma migrate dev --name enhance-upgrade-logic
```

## What I Actually Used (Simplest Approach)

For your immediate fix, I used **Option 2: Extend Subscription** which required:
- ❌ **No new tables**
- ❌ **No schema changes** 
- ✅ **Only updated existing data**

### What the script did:
1. Updated `currentPeriodEnd` in existing `Subscription` record
2. Added a `Transaction` record for audit trail (using existing schema)

## Recommendation for Production

### Immediate (No DB Changes):
```javascript
// Just extend subscription periods for affected users
await prisma.subscription.update({
  where: { tenantId },
  data: { currentPeriodEnd: newExtendedDate }
});
```

### Long-term (With DB Changes):
1. **Add Account Credit system** for future flexibility
2. **Enhance upgrade logic** to prevent the issue
3. **Add proper proration calculations**

## Summary

| Approach | DB Changes Required | Complexity | User Experience |
|----------|-------------------|------------|-----------------|
| **Extend Subscription** | ❌ None | Low | Good |
| **Account Credits** | ✅ New table | Medium | Excellent |
| **Enhanced Upgrade Logic** | ✅ Minor updates | High | Perfect |

For your immediate situation, **no database changes were needed** - I just extended your subscription period using existing tables.

For preventing future issues, you'd want to implement the enhanced upgrade logic with minimal database updates.
