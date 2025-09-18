# Feature Flagging System

This document describes the comprehensive feature flagging system implemented for the Brewery Inventory SaaS platform.

## 🎯 Overview

The feature flagging system allows for:
- **Gradual rollouts** of new features
- **A/B testing** capabilities
- **Emergency feature toggles**
- **Tenant-specific feature control**
- **User role-based feature access**
- **Subscription plan-based features**

## 🏗️ Architecture

### Core Components

1. **Feature Flag Engine** (`lib/feature-flags.ts`)
   - Core evaluation logic
   - Database integration
   - Condition evaluation
   - Rollout percentage handling

2. **React Hooks** (`hooks/useFeatureFlag.ts`)
   - Client-side feature flag evaluation
   - React integration
   - Caching and optimization

3. **API Endpoints**
   - `/api/feature-flags/evaluate` - Single flag evaluation
   - `/api/feature-flags/evaluate-batch` - Multiple flag evaluation
   - `/api/admin/feature-flags` - Admin management

4. **Database Models**
   - `FeatureFlag` - Flag definitions
   - `FeatureFlagCondition` - Conditional logic

## 📊 Database Schema

### FeatureFlag Model
```prisma
model FeatureFlag {
  id                String                 @id @default(cuid())
  name              String                 // Human-readable name
  key               String                 @unique // Unique identifier
  description       String?                // Optional description
  isEnabled         Boolean                @default(false)
  rolloutPercentage Int                    @default(0) // 0-100
  conditions        FeatureFlagCondition[]
  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt
}
```

### FeatureFlagCondition Model
```prisma
model FeatureFlagCondition {
  id        String      @id @default(cuid())
  flagId    String
  flag      FeatureFlag @relation(fields: [flagId], references: [id])
  type      String      // Condition type
  operator  String      // Comparison operator
  value     String      // Comparison value
  isEnabled Boolean     @default(true)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
}
```

## 🔧 Usage

### 1. Basic Feature Flag Check

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';

// Server-side usage
const result = await isFeatureEnabled('new_dashboard_ui', {
  userId: 'user123',
  tenantId: 'tenant456'
});

if (result.isEnabled) {
  // Show new dashboard
} else {
  // Show old dashboard
}
```

### 2. React Hook Usage

```tsx
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

function MyComponent() {
  const { isEnabled, isLoading } = useFeatureFlag('advanced_analytics');
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {isEnabled ? (
        <AdvancedAnalytics />
      ) : (
        <BasicAnalytics />
      )}
    </div>
  );
}
```

### 3. Multiple Flags

```tsx
import { useFeatureFlags } from '@/hooks/useFeatureFlag';

function Dashboard() {
  const { flags, isLoading } = useFeatureFlags([
    'new_dashboard_ui',
    'advanced_analytics',
    'ai_recommendations'
  ]);
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {flags.new_dashboard_ui && <NewDashboard />}
      {flags.advanced_analytics && <Analytics />}
      {flags.ai_recommendations && <Recommendations />}
    </div>
  );
}
```

### 4. Feature Flag Component

```tsx
import { FeatureFlag } from '@/hooks/useFeatureFlag';

function App() {
  return (
    <div>
      <FeatureFlag 
        flagKey="mobile_app_support"
        fallback={<div>Feature not available</div>}
      >
        <MobileAppFeatures />
      </FeatureFlag>
    </div>
  );
}
```

### 5. Higher-Order Component

```tsx
import { withFeatureFlag } from '@/hooks/useFeatureFlag';

const EnhancedComponent = withFeatureFlag(
  'batch_operations',
  FallbackComponent
)(BatchOperationsComponent);
```

### 6. API Route Protection

```typescript
import { withFeatureFlag } from '@/lib/feature-flags';

export const POST = withFeatureFlag('api_v2')(async function(req, res) {
  // API logic here
});
```

## 🎛️ Feature Flag Configuration

### Built-in Flags

The system comes with predefined flags:

```typescript
const DEFAULT_FLAGS = {
  // Core features
  'multi_tenant_support': true,
  'subscription_billing': true,
  'qr_code_scanning': true,
  
  // New features (gradual rollout)
  'advanced_analytics': false,
  'ai_recommendations': false,
  'mobile_app_support': false,
  'api_v2': false,
  
  // Experimental features
  'new_dashboard_ui': false,
  'batch_operations': false,
  'inventory_forecasting': false,
  'integration_marketplace': false,
  
  // Admin features
  'platform_admin_panel': true,
  'system_health_monitoring': true,
  'tenant_analytics': true,
  
  // Performance features
  'redis_caching': false,
  'cdn_optimization': false,
  'database_read_replicas': false,
};
```

### Condition Types

1. **user_id** - Target specific users
2. **tenant_id** - Target specific tenants
3. **user_role** - Target users with specific roles
4. **subscription_plan** - Target users on specific plans
5. **custom** - Custom attribute matching

### Operators

1. **equals** - Exact match
2. **not_equals** - Not equal
3. **in** - Value in comma-separated list
4. **not_in** - Value not in list
5. **contains** - String contains substring
6. **greater_than** - Numeric comparison
7. **less_than** - Numeric comparison

## 🔄 Rollout Strategies

### 1. Percentage Rollout

```typescript
// Enable for 25% of users
const flag = {
  key: 'new_feature',
  isEnabled: true,
  rolloutPercentage: 25
};
```

### 2. User-based Rollout

```typescript
// Enable for specific users
const condition = {
  type: 'user_id',
  operator: 'in',
  value: 'user1,user2,user3'
};
```

### 3. Tenant-based Rollout

```typescript
// Enable for premium tenants
const condition = {
  type: 'subscription_plan',
  operator: 'equals',
  value: 'premium'
};
```

### 4. Role-based Rollout

```typescript
// Enable for admins only
const condition = {
  type: 'user_role',
  operator: 'equals',
  value: 'ADMIN'
};
```

## 🛠️ Administration

### Creating Feature Flags

```bash
# Via API
curl -X POST /api/admin/feature-flags \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Dashboard UI",
    "key": "new_dashboard_ui",
    "description": "Updated dashboard interface",
    "isEnabled": true,
    "rolloutPercentage": 50,
    "conditions": [
      {
        "type": "subscription_plan",
        "operator": "in",
        "value": "premium,enterprise"
      }
    ]
  }'
```

### Admin Hook Usage

```tsx
import { useFeatureFlagAdmin } from '@/hooks/useFeatureFlag';

function AdminPanel() {
  const { 
    flags, 
    isLoading, 
    createFlag, 
    updateFlag, 
    deleteFlag 
  } = useFeatureFlagAdmin();
  
  const handleCreate = async (flagData) => {
    await createFlag(flagData);
  };
  
  // Component logic...
}
```

## 📈 Best Practices

### 1. Naming Conventions

- Use snake_case for flag keys
- Use descriptive names
- Include feature category prefix

```typescript
// Good
'analytics_advanced_reporting'
'ui_new_dashboard'
'api_v2_endpoints'

// Bad
'newFeature'
'test'
'flag1'
```

### 2. Gradual Rollouts

```typescript
// Week 1: 5% rollout
rolloutPercentage: 5

// Week 2: 25% rollout
rolloutPercentage: 25

// Week 3: 50% rollout
rolloutPercentage: 50

// Week 4: 100% rollout
rolloutPercentage: 100
```

### 3. Cleanup Strategy

- Remove flags after full rollout
- Document flag lifecycle
- Set expiration dates
- Regular flag audits

### 4. Testing

```typescript
// Test with different contexts
const testContexts = [
  { userId: 'test1', userRole: 'ADMIN' },
  { userId: 'test2', userRole: 'USER' },
  { tenantId: 'tenant1', subscriptionPlan: 'premium' }
];

for (const context of testContexts) {
  const result = await isFeatureEnabled('test_flag', context);
  console.log(`Context ${JSON.stringify(context)}: ${result.isEnabled}`);
}
```

## 🚨 Error Handling

### Graceful Degradation

```typescript
// Always provide fallback behavior
const { isEnabled, error } = useFeatureFlag('risky_feature');

if (error) {
  // Log error but don't break the app
  console.error('Feature flag error:', error);
}

// Default to safe behavior
return isEnabled ? <NewFeature /> : <OldFeature />;
```

### Error Monitoring

```typescript
// Monitor flag evaluation errors
try {
  const result = await isFeatureEnabled(flagKey, context);
  return result;
} catch (error) {
  // Send to monitoring service
  analytics.track('feature_flag_error', {
    flagKey,
    error: error.message,
    context
  });
  
  // Return safe default
  return { isEnabled: false, reason: 'error_fallback' };
}
```

## 📊 Analytics and Monitoring

### Flag Usage Tracking

```typescript
// Track flag evaluations
const result = await isFeatureEnabled(flagKey, context);

analytics.track('feature_flag_evaluated', {
  flagKey,
  isEnabled: result.isEnabled,
  reason: result.reason,
  userId: context.userId,
  tenantId: context.tenantId
});
```

### Performance Monitoring

```typescript
// Monitor evaluation performance
const startTime = Date.now();
const result = await isFeatureEnabled(flagKey, context);
const duration = Date.now() - startTime;

if (duration > 100) {
  console.warn(`Slow flag evaluation: ${flagKey} took ${duration}ms`);
}
```

## 🔒 Security Considerations

### Access Control

- Only platform admins can manage flags
- Audit all flag changes
- Validate all inputs
- Rate limit API endpoints

### Data Privacy

- Don't log sensitive user data
- Encrypt flag conditions if needed
- Follow GDPR compliance
- Implement data retention policies

## 🧪 Testing

### Unit Tests

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';

describe('Feature Flags', () => {
  it('should enable flag for matching conditions', async () => {
    const result = await isFeatureEnabled('test_flag', {
      userId: 'test-user',
      userRole: 'ADMIN'
    });
    
    expect(result.isEnabled).toBe(true);
  });
});
```

### Integration Tests

```typescript
import { render, screen } from '@testing-library/react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

// Mock the hook
jest.mock('@/hooks/useFeatureFlag');

test('renders new feature when flag is enabled', () => {
  (useFeatureFlag as jest.Mock).mockReturnValue({
    isEnabled: true,
    isLoading: false
  });
  
  render(<MyComponent />);
  expect(screen.getByText('New Feature')).toBeInTheDocument();
});
```

## 📚 Migration Guide

### From Environment Variables

```typescript
// Before
const isNewUIEnabled = process.env.ENABLE_NEW_UI === 'true';

// After
const { isEnabled } = useFeatureFlag('new_ui');
```

### From Hard-coded Flags

```typescript
// Before
const ENABLE_BETA_FEATURES = true;

// After
const { isEnabled } = useFeatureFlag('beta_features', {
  userRole: user.role
});
```

---

**Last Updated**: $(date)
**Version**: 1.0
**Maintained By**: Engineering Team