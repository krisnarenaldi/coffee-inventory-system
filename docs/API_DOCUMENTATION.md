# Brewery Inventory Management System - API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL & Versioning](#base-url--versioning)
4. [Request/Response Format](#requestresponse-format)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Pagination](#pagination)
8. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Users](#users)
   - [Ingredients](#ingredients)
   - [Suppliers](#suppliers)
   - [Recipes](#recipes)
   - [Batches](#batches)
   - [Products](#products)
   - [Alerts](#alerts)
   - [Schedules](#schedules)
   - [Reports](#reports)
   - [Admin](#admin)
   - [Subscription](#subscription)
9. [Webhooks](#webhooks)
10. [SDKs & Libraries](#sdks--libraries)

## Overview

The Brewery Inventory Management System API is a RESTful API that allows developers to integrate with the brewery inventory management platform. The API supports multi-tenancy, role-based access control, and comprehensive inventory tracking.

### Key Features
- Multi-tenant architecture
- Role-based permissions
- Real-time inventory tracking
- Batch production management
- Comprehensive reporting
- Subscription management
- Webhook notifications

## Authentication

The API uses NextAuth.js for authentication with support for multiple providers.

### Authentication Methods

#### 1. Session-based Authentication (Web)
```javascript
// Login request
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@brewery.com",
  "password": "securepassword"
}

// Response
{
  "user": {
    "id": "user_123",
    "email": "user@brewery.com",
    "name": "John Doe",
    "role": "MANAGER",
    "tenantId": "tenant_abc"
  },
  "expires": "2024-01-01T00:00:00.000Z"
}
```

#### 2. API Key Authentication (Programmatic)
```bash
# Include API key in headers
curl -H "Authorization: Bearer your-api-key" \
     -H "Content-Type: application/json" \
     https://api.breweryinventory.com/api/ingredients
```

### Getting Session Information
```javascript
GET /api/auth/session

// Response
{
  "user": {
    "id": "user_123",
    "email": "user@brewery.com",
    "name": "John Doe",
    "role": "MANAGER",
    "tenantId": "tenant_abc"
  },
  "expires": "2024-01-01T00:00:00.000Z"
}
```

## Base URL & Versioning

```
Base URL: https://[tenant].breweryinventory.com/api
API Version: v1 (current)
```

### Multi-tenant URLs
- Production: `https://[your-brewery].breweryinventory.com/api`
- Staging: `https://[your-brewery].staging.breweryinventory.com/api`
- Development: `http://localhost:3000/api`

## Request/Response Format

### Content Type
All requests should use `Content-Type: application/json`

### Request Headers
```
Content-Type: application/json
Authorization: Bearer [session-token]
X-Tenant-ID: [tenant-id] (optional, auto-detected from subdomain)
```

### Response Format
```json
{
  "data": {},
  "message": "Success",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

### Error Response Examples

#### Validation Error (400)
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "name",
      "message": "Name is required"
    },
    {
      "field": "stockQuantity",
      "message": "Stock quantity must be non-negative"
    }
  ]
}
```

#### Subscription Limit Error (403)
```json
{
  "error": "Subscription limit exceeded",
  "message": "You have reached the maximum number of ingredients allowed by your subscription plan.",
  "currentUsage": 50,
  "limit": 50
}
```

## Rate Limiting

API requests are rate limited per tenant:
- **Free Plan**: 100 requests/hour
- **Pro Plan**: 1,000 requests/hour
- **Enterprise Plan**: 10,000 requests/hour

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination using query parameters:

```
GET /api/ingredients?page=1&limit=10
```

### Pagination Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## API Endpoints

### Authentication Endpoints

#### Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@brewery.com",
  "password": "securepassword",
  "tenantId": "brewery_abc"
}
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@brewery.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_123",
  "password": "newpassword"
}
```

### Users

#### Get All Users
```http
GET /api/admin/users?page=1&limit=10&search=john&role=MANAGER

Response:
{
  "users": [
    {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@brewery.com",
      "role": "MANAGER",
      "isActive": true,
      "lastLogin": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

#### Create User
```http
POST /api/admin/users
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@brewery.com",
  "role": "BREWMASTER"
}
```

#### Update User
```http
PUT /api/admin/users/user_123
Content-Type: application/json

{
  "name": "Jane Smith Updated",
  "role": "MANAGER",
  "isActive": true
}
```

#### Delete User
```http
DELETE /api/admin/users/user_123
```

### Ingredients

#### Get All Ingredients
```http
GET /api/ingredients?page=1&limit=10&search=hops&type=COFFEE_BEANS&lowStock=true&sortBy=name&sortOrder=asc

Response:
{
  "ingredients": [
    {
      "id": "ing_123",
      "name": "Cascade Hops",
      "type": "COFFEE_BEANS",
      "stockQuantity": 25.5,
      "unitOfMeasure": "kg",
      "minimumThreshold": 10.0,
      "costPerUnit": 15.50,
      "location": "Cold Storage A",
      "batchNumber": "BATCH_001",
      "expirationDate": "2024-06-01T00:00:00.000Z",
      "supplier": {
        "id": "sup_123",
        "name": "Hop Suppliers Inc"
      },
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### Create Ingredient
```http
POST /api/ingredients
Content-Type: application/json

{
  "name": "Centennial Hops",
  "type": "COFFEE_BEANS",
  "stockQuantity": 50.0,
  "unitOfMeasure": "kg",
  "minimumThreshold": 15.0,
  "costPerUnit": 18.00,
  "location": "Cold Storage B",
  "batchNumber": "BATCH_002",
  "expirationDate": "2024-08-01",
  "supplierId": "sup_123"
}
```

#### Update Ingredient
```http
PUT /api/ingredients/ing_123
Content-Type: application/json

{
  "stockQuantity": 30.0,
  "location": "Cold Storage C"
}
```

#### Delete Ingredient
```http
DELETE /api/ingredients/ing_123
```

### Suppliers

#### Get All Suppliers
```http
GET /api/suppliers?page=1&limit=10&search=hop

Response:
{
  "suppliers": [
    {
      "id": "sup_123",
      "name": "Hop Suppliers Inc",
      "contactPerson": "Mike Johnson",
      "email": "mike@hopsuppliers.com",
      "phone": "+1-555-0123",
      "address": "123 Hop Street, Portland, OR 97201",
      "notes": "Reliable supplier for premium hops",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Supplier
```http
POST /api/suppliers
Content-Type: application/json

{
  "name": "Malt Masters LLC",
  "contactPerson": "Sarah Wilson",
  "email": "sarah@maltmasters.com",
  "phone": "+1-555-0456",
  "address": "456 Malt Avenue, Denver, CO 80202",
  "notes": "Specialty malt supplier"
}
```

### Recipes

#### Get All Recipes
```http
GET /api/recipes?page=1&limit=10&search=ipa&sortBy=name

Response:
{
  "recipes": [
    {
      "id": "rec_123",
      "name": "West Coast IPA",
      "style": "American IPA",
      "description": "Hoppy and bitter with citrus notes",
      "expectedYield": 500.0,
      "processInstructions": "Mash at 152°F for 60 minutes...",
      "version": 2,
      "isActive": true,
      "ingredients": [
        {
          "id": "ri_123",
          "ingredient": {
            "id": "ing_123",
            "name": "Cascade Hops",
            "type": "COFFEE_BEANS"
          },
          "quantity": 2.5,
          "unit": "kg",
          "notes": "Add at 60 minutes"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Recipe
```http
POST /api/recipes
Content-Type: application/json

{
  "name": "East Coast IPA",
  "style": "New England IPA",
  "description": "Hazy and juicy with tropical fruit flavors",
  "expectedYield": 400.0,
  "processInstructions": "Mash at 150°F for 90 minutes...",
  "ingredients": [
    {
      "ingredientId": "ing_456",
      "quantity": 3.0,
      "unit": "kg",
      "notes": "Whirlpool addition"
    }
  ]
}
```

#### Duplicate Recipe
```http
POST /api/recipes/rec_123/duplicate
Content-Type: application/json

{
  "name": "West Coast IPA v2",
  "modifications": {
    "expectedYield": 600.0
  }
}
```

### Batches

#### Get All Batches
```http
GET /api/batches?page=1&limit=10&status=ROASTING&recipeId=rec_123&sortBy=startDate&sortOrder=desc

Response:
{
  "batches": [
    {
      "id": "bat_123",
      "batchNumber": "IPA-2024-001",
      "status": "ROASTING",
      "startDate": "2024-01-15T08:00:00.000Z",
      "endDate": null,
      "actualYield": null,
      "measurements": {
        "originalGravity": 1.065,
        "temperature": 152,
        "pH": 5.4
      },
      "notes": "Batch started on schedule",
      "recipe": {
        "id": "rec_123",
        "name": "West Coast IPA",
        "style": "American IPA",
        "expectedYield": 500.0
      },
      "createdBy": {
        "id": "user_123",
        "name": "John Doe"
      },
      "products": [],
      "createdAt": "2024-01-15T08:00:00.000Z"
    }
  ]
}
```

#### Create Batch
```http
POST /api/batches
Content-Type: application/json

{
  "recipeId": "rec_123",
  "batchNumber": "IPA-2024-002",
  "startDate": "2024-01-20T09:00:00.000Z",
  "notes": "Weekend batch production"
}
```

#### Start Batch
```http
POST /api/batches/bat_123/start
Content-Type: application/json

{
  "measurements": {
    "originalGravity": 1.068,
    "temperature": 154,
    "pH": 5.2
  },
  "notes": "Started with higher gravity than expected"
}
```

#### Update Batch Status
```http
PUT /api/batches/bat_123
Content-Type: application/json

{
  "status": "COOLING",
  "measurements": {
    "finalGravity": 1.012,
    "ABV": 7.2,
    "temperature": 68
  },
  "notes": "Fermentation complete, moving to cooling"
}
```

### Products

#### Get All Products
```http
GET /api/products?page=1&limit=10&status=IN_STOCK&batchId=bat_123

Response:
{
  "products": [
    {
      "id": "prod_123",
      "name": "West Coast IPA - Keg",
      "quantity": 10,
      "packagingDate": "2024-01-25T00:00:00.000Z",
      "lotNumber": "LOT-2024-001",
      "shelfLife": 90,
      "storageLocation": "Cold Storage - Kegs",
      "status": "IN_STOCK",
      "batch": {
        "id": "bat_123",
        "batchNumber": "IPA-2024-001",
        "recipe": {
          "name": "West Coast IPA"
        }
      },
      "packagingType": {
        "id": "pkg_123",
        "name": "1/2 BBL Keg"
      },
      "createdAt": "2024-01-25T00:00:00.000Z"
    }
  ]
}
```

#### Create Product
```http
POST /api/products
Content-Type: application/json

{
  "batchId": "bat_123",
  "name": "West Coast IPA - Bottles",
  "packagingTypeId": "pkg_456",
  "quantity": 200,
  "packagingDate": "2024-01-25",
  "lotNumber": "LOT-2024-002",
  "shelfLife": 120,
  "storageLocation": "Bottle Storage A"
}
```

#### Move Product
```http
POST /api/products/prod_123/movement
Content-Type: application/json

{
  "newLocation": "Distribution Center",
  "quantity": 5,
  "reason": "Shipment to distributor",
  "notes": "Delivery scheduled for tomorrow"
}
```

### Alerts

#### Get All Alerts
```http
GET /api/alerts?page=1&limit=10&type=LOW_STOCK&severity=HIGH&isRead=false

Response:
{
  "alerts": [
    {
      "id": "alert_123",
      "type": "LOW_STOCK",
      "title": "Low Stock Alert: Cascade Hops",
      "message": "Cascade Hops stock level (8.5 kg) is below minimum threshold (10.0 kg)",
      "severity": "HIGH",
      "isRead": false,
      "isResolved": false,
      "createdAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

#### Mark Alert as Read
```http
PUT /api/alerts/alert_123
Content-Type: application/json

{
  "isRead": true
}
```

#### Resolve Alert
```http
PUT /api/alerts/alert_123
Content-Type: application/json

{
  "isResolved": true,
  "resolutionNotes": "Ordered additional stock from supplier"
}
```

### Schedules

#### Get All Schedules
```http
GET /api/schedules?startDate=2024-01-01&endDate=2024-01-31&type=BREW_SESSION

Response:
{
  "schedules": [
    {
      "id": "sched_123",
      "title": "West Coast IPA Brew Session",
      "description": "Brewing batch IPA-2024-003",
      "type": "BREW_SESSION",
      "startDate": "2024-01-22T08:00:00.000Z",
      "endDate": "2024-01-22T16:00:00.000Z",
      "isRecurring": false,
      "status": "SCHEDULED",
      "createdAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

#### Create Schedule
```http
POST /api/schedules
Content-Type: application/json

{
  "title": "Equipment Maintenance",
  "description": "Monthly cleaning of fermentation tanks",
  "type": "MAINTENANCE",
  "startDate": "2024-02-01T09:00:00.000Z",
  "endDate": "2024-02-01T17:00:00.000Z",
  "isRecurring": true,
  "recurrenceRule": "FREQ=MONTHLY;BYMONTHDAY=1"
}
```

### Reports

#### Inventory Valuation Report
```http
GET /api/reports/inventory-valuation?startDate=2024-01-01&endDate=2024-01-31&format=json

Response:
{
  "report": {
    "totalValue": 25750.50,
    "categories": [
      {
        "type": "COFFEE_BEANS",
        "value": 15000.00,
        "percentage": 58.3
      },
      {
        "type": "PACKAGING",
        "value": 5500.00,
        "percentage": 21.4
      }
    ],
    "topIngredients": [
      {
        "name": "Premium Malt",
        "value": 8500.00,
        "quantity": 500.0,
        "unit": "kg"
      }
    ],
    "generatedAt": "2024-01-31T23:59:59.000Z"
  }
}
```

#### Batch Consistency Report
```http
GET /api/reports/batch-consistency?recipeId=rec_123&startDate=2024-01-01&endDate=2024-01-31

Response:
{
  "report": {
    "recipeId": "rec_123",
    "recipeName": "West Coast IPA",
    "batchCount": 5,
    "averageYield": 485.2,
    "yieldVariance": 12.8,
    "qualityMetrics": {
      "averageABV": 6.8,
      "abvVariance": 0.3,
      "averageIBU": 65,
      "ibuVariance": 3.2
    },
    "batches": [
      {
        "batchNumber": "IPA-2024-001",
        "yield": 495.0,
        "abv": 7.0,
        "ibu": 67
      }
    ]
  }
}
```

### Admin Endpoints

#### Get System Health
```http
GET /api/admin/system-health

Response:
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "responseTime": 15
  },
  "services": {
    "email": "operational",
    "storage": "operational",
    "queue": "operational"
  },
  "metrics": {
    "uptime": 99.98,
    "memoryUsage": 65.2,
    "cpuUsage": 23.1
  }
}
```

#### Get Tenant Analytics
```http
GET /api/admin/analytics/tenant-comparison?metric=activeUsers&period=30d

Response:
{
  "analytics": {
    "metric": "activeUsers",
    "period": "30d",
    "tenants": [
      {
        "tenantId": "tenant_abc",
        "tenantName": "Craft Brewery Co",
        "value": 15,
        "change": "+20%"
      }
    ],
    "summary": {
      "total": 450,
      "average": 18.5,
      "growth": "+12%"
    }
  }
}
```

### Subscription

#### Get Current Subscription
```http
GET /api/subscription

Response:
{
  "subscription": {
    "id": "sub_123",
    "status": "ACTIVE",
    "plan": {
      "id": "plan_pro",
      "name": "Pro Plan",
      "price": 99.00,
      "interval": "MONTHLY",
      "features": {
        "maxUsers": 10,
        "maxIngredients": 500,
        "maxBatches": 100,
        "advancedReports": true,
        "apiAccess": true
      }
    },
    "currentPeriodStart": "2024-01-01T00:00:00.000Z",
    "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false
  }
}
```

#### Get Usage Metrics
```http
GET /api/subscription/usage

Response:
{
  "usage": {
    "users": {
      "current": 8,
      "limit": 10,
      "percentage": 80
    },
    "ingredients": {
      "current": 245,
      "limit": 500,
      "percentage": 49
    },
    "batches": {
      "current": 23,
      "limit": 100,
      "percentage": 23
    },
    "apiCalls": {
      "current": 1250,
      "limit": 10000,
      "percentage": 12.5,
      "resetDate": "2024-02-01T00:00:00.000Z"
    }
  }
}
```

#### Upgrade Subscription
```http
POST /api/subscription/upgrade
Content-Type: application/json

{
  "planId": "plan_enterprise",
  "billingCycle": "YEARLY"
}
```

## Webhooks

Webhooks allow you to receive real-time notifications when events occur in your brewery inventory system.

### Webhook Events

- `ingredient.low_stock` - Ingredient falls below minimum threshold
- `ingredient.expired` - Ingredient passes expiration date
- `batch.status_changed` - Batch status updated
- `batch.completed` - Batch production completed
- `product.created` - New product created from batch
- `alert.created` - New alert generated
- `user.created` - New user added to tenant
- `subscription.updated` - Subscription plan changed

### Webhook Configuration

```http
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/brewery-inventory",
  "events": ["ingredient.low_stock", "batch.completed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload Example

```json
{
  "id": "evt_123",
  "type": "ingredient.low_stock",
  "tenantId": "tenant_abc",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "data": {
    "ingredient": {
      "id": "ing_123",
      "name": "Cascade Hops",
      "currentStock": 8.5,
      "minimumThreshold": 10.0,
      "unit": "kg"
    }
  }
}
```

### Webhook Verification

Verify webhook authenticity using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = hmac.digest('hex');
  return signature === `sha256=${digest}`;
}
```

## SDKs & Libraries

### JavaScript/Node.js SDK

```bash
npm install @brewery-inventory/sdk
```

```javascript
const BreweryInventory = require('@brewery-inventory/sdk');

const client = new BreweryInventory({
  apiKey: 'your-api-key',
  tenant: 'your-brewery'
});

// Get ingredients
const ingredients = await client.ingredients.list({
  page: 1,
  limit: 10,
  lowStock: true
});

// Create batch
const batch = await client.batches.create({
  recipeId: 'rec_123',
  batchNumber: 'IPA-2024-003'
});
```

### Python SDK

```bash
pip install brewery-inventory-sdk
```

```python
from brewery_inventory import BreweryInventoryClient

client = BreweryInventoryClient(
    api_key='your-api-key',
    tenant='your-brewery'
)

# Get ingredients
ingredients = client.ingredients.list(
    page=1,
    limit=10,
    low_stock=True
)

# Create batch
batch = client.batches.create(
    recipe_id='rec_123',
    batch_number='IPA-2024-003'
)
```

### cURL Examples

```bash
# Get ingredients with low stock
curl -H "Authorization: Bearer your-api-key" \
     "https://your-brewery.breweryinventory.com/api/ingredients?lowStock=true"

# Create new ingredient
curl -X POST \
     -H "Authorization: Bearer your-api-key" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Centennial Hops",
       "type": "COFFEE_BEANS",
       "stockQuantity": 50.0,
       "unitOfMeasure": "kg",
       "minimumThreshold": 15.0,
       "costPerUnit": 18.00
     }' \
     "https://your-brewery.breweryinventory.com/api/ingredients"
```

---

## Support

For API support and questions:

- **Documentation**: [https://docs.breweryinventory.com](https://docs.breweryinventory.com)
- **API Status**: [https://status.breweryinventory.com](https://status.breweryinventory.com)
- **Support Email**: api-support@breweryinventory.com
- **Developer Forum**: [https://community.breweryinventory.com](https://community.breweryinventory.com)

---

*Last updated: [Current Date]*
*API Version: v1.0*

This documentation is automatically updated. For the latest changes, please refer to our [changelog](https://docs.breweryinventory.com/changelog).