# Performance Dashboard Setup Guide

## 🚀 What's Been Created

I've set up a comprehensive performance monitoring dashboard for your coffee inventory system:

### **1. Performance Monitoring System**
- **`lib/performance-monitor.ts`** - Core performance tracking system
- **`src/app/api/admin/performance/route.ts`** - API endpoint for performance data
- **`src/app/admin/performance/page.tsx`** - Dashboard UI component

### **2. Dashboard Features**
- **Real-time Performance Metrics** - Track API response times, database queries, and system performance
- **Cache Statistics** - Monitor cache hit rates and stored keys
- **System Information** - Memory usage, uptime, Node.js version
- **Slow Operation Detection** - Automatically flags operations taking >1 second
- **Auto-refresh** - Updates every 30 seconds
- **Metric Filtering** - Filter by specific operation types

### **3. Navigation Integration**
- Added "Performance" tab to admin navigation with ⚡ icon
- Only accessible to PLATFORM_ADMIN users

## 🎯 How to Access

1. **Login as Platform Admin**:
   - Make sure your user has `role: "PLATFORM_ADMIN"`
   
2. **Navigate to Performance Dashboard**:
   - Go to: `http://admin.localhost:3000/admin/performance`
   - Or click "Performance" in the admin navigation

3. **Test the System**:
   - Visit: `http://localhost:3000/api/test-performance` to generate test metrics
   - Refresh the dashboard to see the data

## 📊 Dashboard Tabs

### **Overview Tab**
- **Total Operations** - Number of tracked operations
- **Average Response Time** - Color-coded performance indicator
- **Cache Size** - Number of cached entries
- **Memory Usage** - Current heap usage
- **Recent Slow Operations** - Operations taking >1 second

### **Performance Tab**
- **Metric Filtering** - Filter by specific operation types
- **Performance Statistics** - Min, Average, Max response times
- **Operation Breakdown** - Detailed stats for each metric type

### **Cache Tab**
- **Cache Statistics** - Current cache size and status
- **Cache Keys** - List of all cached keys
- **Cache Health** - Overview of caching effectiveness

### **System Tab**
- **Memory Usage** - Heap used, total, and external memory
- **System Information** - Uptime, Node version, platform, architecture

## 🔧 Configuration Options

### **Environment Variables**
Add to your `.env` file:
```bash
# Performance Optimization
BCRYPT_ROUNDS=10  # Use 10 for development, 12 for production
```

### **Performance Thresholds**
The system automatically:
- **Logs slow operations** taking >1 second
- **Color-codes performance** (Green <100ms, Yellow <500ms, Orange <1000ms, Red >1000ms)
- **Limits cache size** to 1000 entries to prevent memory leaks
- **Auto-cleans cache** every 5 minutes

## 🚀 Using Performance Monitoring in Your Code

### **Measure API Endpoints**
```typescript
import { measureAsync } from '../../../../lib/performance-monitor';

export async function GET(request: NextRequest) {
  return measureAsync("my_api_endpoint", async () => {
    // Your API logic here
    const data = await someExpensiveOperation();
    return NextResponse.json(data);
  }, { 
    tenantId: "optional-metadata",
    operation: "data-fetch" 
  });
}
```

### **Measure Database Queries**
```typescript
import { measureDatabaseQuery } from '../../../../lib/performance-monitor';

const users = await measureDatabaseQuery("get_users", async () => {
  return await prisma.user.findMany({ where: { tenantId } });
});
```

### **Manual Metrics**
```typescript
import { performanceMonitor } from '../../../../lib/performance-monitor';

performanceMonitor.recordMetric({
  name: "custom_operation",
  duration: 150,
  timestamp: new Date(),
  metadata: { type: "custom", userId: "123" }
});
```

## 📈 Performance Improvements Already Applied

The dashboard will show the impact of optimizations we've implemented:

1. **Caching System** - Dashboard, subscription, and pricing data caching
2. **Database Optimization** - Parallel queries and connection pooling
3. **Middleware Optimization** - Removed production console logging
4. **Async Activity Logging** - Non-blocking user activity logging

## 🔍 Monitoring Best Practices

### **What to Watch For**
- **Average response times** increasing over time
- **Slow operations** appearing frequently
- **Memory usage** growing continuously
- **Cache hit rates** being low

### **Performance Targets**
- **API responses**: <200ms average
- **Database queries**: <100ms average
- **Dashboard loading**: <500ms
- **Memory usage**: Stable, not growing

### **Troubleshooting**
- **High response times**: Check database queries and caching
- **Memory leaks**: Look for growing memory usage over time
- **Cache misses**: Verify cache TTL settings and invalidation
- **Slow operations**: Identify bottlenecks in specific endpoints

## 🛠️ Advanced Features

### **Clear Metrics**
- Use the "Clear Metrics" button to reset all performance data
- Useful for testing or after making performance improvements

### **Metric Filtering**
- Click on specific operation types to see detailed statistics
- Helps identify which parts of your application need optimization

### **Real-time Monitoring**
- Dashboard auto-refreshes every 30 seconds
- Shows live performance data as users interact with your application

## 🎉 Next Steps

1. **Deploy the changes** to see performance improvements
2. **Access the dashboard** as a platform admin
3. **Monitor key metrics** during normal usage
4. **Add performance monitoring** to critical API endpoints
5. **Set up alerts** for performance degradation (future enhancement)

The performance dashboard will help you maintain optimal application performance and quickly identify any issues that arise!
