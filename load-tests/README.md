# Load Testing & Performance Monitoring

This directory contains load testing configurations and performance monitoring tools for the Brewery Inventory Management System.

## 🚀 Quick Start

### Prerequisites

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Ensure the database is running and seeded:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

### Running Load Tests

#### Option 1: Full Load Test Suite (Recommended)
```bash
npm run load-test
```
This runs the comprehensive load testing script with system monitoring and detailed reporting.

#### Option 2: Quick Artillery Test
```bash
npm run load-test:quick
```
Runs just the Artillery load test without additional monitoring.

#### Option 3: Database Performance Analysis
```bash
npm run db:performance
```
Analyzes database performance, slow queries, and provides optimization recommendations.

#### Option 4: Complete Performance Suite
```bash
npm run performance:all
```
Runs both database performance analysis and load testing.

## 📊 Test Scenarios

### 1. Authentication Load Test (30% of traffic)
- Tests user login/logout flows
- Validates session management under load
- Checks authentication rate limiting

### 2. API Endpoints Load Test (40% of traffic)
- Tests core API endpoints:
  - `/api/products`
  - `/api/batches`
  - `/api/recipes`
  - `/api/ingredients`
- Validates response times and error rates

### 3. Database Operations Load Test (20% of traffic)
- Tests CRUD operations
- Creates and retrieves products
- Validates database performance under load

### 4. Rate Limiting Test (10% of traffic)
- Tests rate limiting functionality
- Validates security measures
- Checks for proper 429 responses

## 📈 Load Test Phases

1. **Warm up** (60s): 5 requests/second
2. **Ramp up** (120s): 10 requests/second
3. **Sustained load** (300s): 20 requests/second

## 📋 Reports Generated

After running tests, reports are saved in `load-tests/reports/`:

### Artillery Reports
- `artillery-report-[timestamp].json` - Raw test data
- `artillery-report-[timestamp].html` - Visual HTML report

### Database Performance Reports
- `db-performance-[timestamp].json` - Database analysis
- `system-metrics.json` - System resource usage

### Load Test Suite Reports
- `db-performance.log` - Query performance log
- System monitoring data

## 🔧 Configuration

### Artillery Configuration (`artillery.yml`)

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    # ... more phases
```

### Test Data (`test-data.csv`)

Contains test user credentials:
- admin@brewery.com
- manager@brewery.com
- brewmaster@brewery.com
- etc.

## 📊 Performance Metrics

### Key Metrics Monitored

1. **Response Time**
   - Target: < 2 seconds average
   - Alert: > 3 seconds

2. **Database Queries**
   - Target: < 1 second per query
   - Alert: > 1 second (slow query)

3. **Memory Usage**
   - Monitor: Heap usage
   - Alert: > 512MB peak usage

4. **Error Rate**
   - Target: < 1%
   - Alert: > 5%

### Database Performance Checks

- **Table Analysis**: Row counts, table sizes, query performance
- **Index Usage**: Identifies unused or missing indexes
- **Slow Query Detection**: Queries taking > 1 second
- **Common Query Patterns**: Tests typical application queries

## 🚨 Performance Alerts

The system will alert you to:

- Slow database queries (> 1 second)
- High memory usage (> 512MB)
- Poor response times (> 3 seconds)
- High error rates (> 5%)
- Unused database indexes
- Tables needing optimization

## 🛠️ Troubleshooting

### Common Issues

1. **Server not running**
   ```
   Error: Server is not running on localhost:3000
   Solution: Run `npm run dev` first
   ```

2. **Database connection errors**
   ```
   Error: Database connection failed
   Solution: Check DATABASE_URL in .env file
   ```

3. **Artillery not found**
   ```
   Error: artillery command not found
   Solution: Run `npm install` to install dependencies
   ```

### Performance Issues

1. **Slow queries detected**
   - Review the slow queries in the report
   - Consider adding database indexes
   - Optimize query patterns

2. **High memory usage**
   - Check for memory leaks
   - Review connection pooling
   - Consider caching strategies

3. **High error rates**
   - Check server logs
   - Review rate limiting settings
   - Validate test data

## 📝 Customization

### Modifying Load Test Parameters

Edit `artillery.yml` to adjust:
- Test duration
- Request rates
- Target endpoints
- Test scenarios

### Adding New Test Scenarios

1. Add new scenario to `artillery.yml`
2. Update test data in `test-data.csv`
3. Modify weight distribution

### Custom Performance Monitoring

Edit `scripts/db-performance-monitor.js` to:
- Add new query tests
- Modify slow query threshold
- Add custom metrics

## 🎯 Best Practices

1. **Run tests regularly** - Include in CI/CD pipeline
2. **Monitor trends** - Compare reports over time
3. **Test realistic scenarios** - Use production-like data
4. **Set performance budgets** - Define acceptable thresholds
5. **Optimize incrementally** - Address highest impact issues first

## 📚 Additional Resources

- [Artillery Documentation](https://artillery.io/docs/)
- [Prisma Performance Guide](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)

---

**Note**: Always run load tests in a controlled environment. Avoid running against production systems without proper planning and approval.