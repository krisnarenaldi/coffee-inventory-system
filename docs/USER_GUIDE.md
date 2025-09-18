# Brewery Inventory Management System - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [User Management](#user-management)
4. [Inventory Management](#inventory-management)
5. [Recipe Management](#recipe-management)
6. [Production & Batch Tracking](#production--batch-tracking)
7. [Product Management](#product-management)
8. [Alerts & Notifications](#alerts--notifications)
9. [Scheduling](#scheduling)
10. [Reports & Analytics](#reports--analytics)
11. [Subscription Management](#subscription-management)
12. [Troubleshooting](#troubleshooting)

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- JavaScript enabled

### Accessing the System

1. Navigate to your brewery's subdomain: `https://[your-brewery].breweryinventory.com`
2. Enter your email and password
3. Click "Sign In"

### First Time Setup

1. **Complete Your Profile**: Update your name and contact information
2. **Set Up Your Brewery**: Configure basic brewery settings
3. **Add Team Members**: Invite staff and assign appropriate roles
4. **Configure Storage Locations**: Set up your physical storage areas
5. **Add Suppliers**: Enter your supplier information
6. **Import Initial Inventory**: Add your current ingredients and products

## Dashboard Overview

The dashboard provides a real-time overview of your brewery operations:

### Key Metrics

- **Total Inventory Value**: Current value of all ingredients and products
- **Active Batches**: Number of batches currently in production
- **Low Stock Alerts**: Items requiring immediate attention
- **Upcoming Schedules**: Today's planned activities

### Quick Actions

- Create new batch
- Add inventory adjustment
- View recent alerts
- Access reports

## User Management

### User Roles

#### Admin

- Full system access
- Manage users and permissions
- Configure system settings
- Access all reports and analytics

#### Manager

- Oversee daily operations
- Manage inventory and production
- View operational reports
- Manage schedules and alerts

#### Brewmaster

- Create and manage recipes
- Start and monitor batches
- Record production measurements
- Access brewing reports

#### Warehouse Staff

- Update inventory levels
- Receive shipments
- Perform stock adjustments
- Scan QR codes for tracking

#### Sales

- View product availability
- Access sales reports
- Monitor finished goods inventory

### Managing Users

#### Adding New Users

1. Navigate to **Users** section
2. Click **Add User**
3. Enter user details:
   - Name
   - Email address
   - Role assignment
4. Click **Send Invitation**
5. User will receive email with setup instructions

#### Modifying User Permissions

1. Go to **Users** > **[User Name]**
2. Click **Edit Permissions**
3. Select appropriate role
4. Save changes

## Inventory Management

### Ingredients

#### Adding New Ingredients

1. Navigate to **Inventory** > **Ingredients**
2. Click **Add Ingredient**
3. Fill in details:
   - Name and type
   - Unit of measure
   - Minimum threshold
   - Cost per unit
   - Supplier information
   - Storage location
4. Save ingredient

#### Managing Stock Levels

**Manual Adjustments**

1. Find ingredient in list
2. Click **Adjust Stock**
3. Select adjustment type:
   - Increase (new shipment)
   - Decrease (usage/waste)
   - Correction (count discrepancy)
4. Enter quantity and reason
5. Save adjustment

**Receiving Shipments**

1. Go to **Inventory** > **Shipments**
2. Click **New Shipment**
3. Select supplier
4. Add items with quantities
5. Record batch numbers and expiration dates
6. Mark as received

#### QR Code Scanning

1. Click **Scan QR Code** button
2. Allow camera access
3. Point camera at QR code
4. System automatically updates inventory

### Storage Locations

#### Setting Up Locations

1. Navigate to **Settings** > **Storage Locations**
2. Click **Add Location**
3. Enter:
   - Location name
   - Description
   - Capacity (optional)
4. Save location

### Suppliers

#### Managing Supplier Information

1. Go to **Inventory** > **Suppliers**
2. Click **Add Supplier** or edit existing
3. Enter contact details:
   - Company name
   - Contact person
   - Email and phone
   - Address
   - Notes
4. Save supplier information

## Recipe Management

### Creating Recipes

1. Navigate to **Recipes**
2. Click **Create Recipe**
3. Enter basic information:
   - Recipe name
   - Style/type
   - Description
   - Expected yield
4. Add ingredients:
   - Select ingredient from dropdown
   - Enter quantity and unit
   - Add notes if needed
5. Enter process instructions
6. Save recipe

### Recipe Versioning

- System automatically tracks recipe versions
- Previous versions remain accessible
- Changes create new version numbers
- Batches link to specific recipe versions

### Duplicating Recipes

1. Find recipe in list
2. Click **Duplicate**
3. Modify name and details
4. Adjust ingredients as needed
5. Save new recipe

## Production & Batch Tracking

### Starting a New Batch

1. Navigate to **Production** > **Batches**
2. Click **Start New Batch**
3. Select recipe
4. Enter batch details:
   - Batch number (auto-generated or custom)
   - Planned start date
   - Notes
5. Click **Start Batch**
6. System automatically deducts ingredients from inventory

### Batch Status Tracking

#### Status Levels

- **Planned**: Batch scheduled but not started
- **Green Beans**: Raw materials prepared
- **In Progress**: Active processing/roasting
- **Completed**: Final status
- **Cancelled**: Batch cancelled

#### Updating Batch Status

1. Open batch details
2. Click **Update Status**
3. Select new status
4. Add notes about the transition
5. Save changes

### Recording Measurements

1. Open active batch
2. Click **Add Measurement**
3. Record data:
   - Temperature
   - Gravity readings
   - ABV percentage
   - pH levels
   - Tasting notes
4. Save measurements

### Batch Completion

1. Update status to **Completed**
2. Record actual yield
3. Note any deviations from recipe
4. Create products from completed batch

## Product Management

### Creating Products from Batches

1. Navigate to completed batch
2. Click **Create Products**
3. Select packaging type:
   - Kegs
   - Bottles
   - Cans
   - Bulk
4. Enter quantities per package type
5. Set packaging date and lot numbers
6. Assign storage locations
7. Save products

### Product Tracking

#### Status Management

- **In Stock**: Available for sale
- **Low Stock**: Below threshold
- **Out of Stock**: Depleted
- **Expired**: Past shelf life
- **Recalled**: Quality issue

#### Moving Products

1. Select product
2. Click **Move Product**
3. Enter:
   - New location
   - Quantity moved
   - Reason for move
4. Save movement record

### Packaging Types

#### Setting Up Package Types

1. Go to **Settings** > **Packaging Types**
2. Click **Add Type**
3. Enter name and description
4. Save packaging type

## Alerts & Notifications

### Alert Types

#### Low Stock Alerts

- Triggered when ingredient falls below minimum threshold
- Shows current quantity and reorder amount
- Links to supplier information

#### Expiration Alerts

- Warns of ingredients/products nearing expiration
- Configurable warning periods
- Helps prevent waste

#### Batch Ready Alerts

- Notifies when batch status changes
- Alerts for quality check requirements
- Production milestone notifications

#### Maintenance Alerts

- Equipment maintenance reminders
- Cleaning schedule notifications
- Calibration due dates

### Managing Alerts

#### Viewing Alerts

1. Check alert icon in top navigation
2. Click to view all active alerts
3. Filter by type or severity

#### Resolving Alerts

1. Click on alert
2. Take appropriate action
3. Mark as resolved
4. Add resolution notes

#### Alert Settings

1. Navigate to **Settings** > **Alerts**
2. Configure thresholds:
   - Low stock percentages
   - Expiration warning days
   - Batch milestone notifications
3. Set notification preferences:
   - Email notifications
   - In-app only
   - SMS (if available)

## Scheduling

### Creating Schedules

1. Navigate to **Schedule**
2. Click **Add Event**
3. Select event type:
   - Brew Session
   - Maintenance
   - Cleaning
   - Delivery
   - Meeting
4. Enter details:
   - Title and description
   - Start and end times
   - Recurrence (if applicable)
5. Save event

### Schedule Types

#### Brew Sessions

- Link to specific recipes
- Resource allocation
- Equipment booking
- Staff assignments

#### Maintenance

- Equipment maintenance schedules
- Preventive maintenance tracking
- Service provider information

#### Cleaning

- Sanitation schedules
- Deep cleaning cycles
- Chemical usage tracking

### Calendar Views

- **Day View**: Detailed daily schedule
- **Week View**: Weekly overview
- **Month View**: Monthly planning
- **List View**: Chronological list

## Reports & Analytics

### Inventory Reports

#### Inventory Valuation

- Current value of all inventory
- Cost basis calculations
- Aging analysis
- Export to Excel/PDF

#### Stock Movement

- Ingredient usage patterns
- Turnover rates
- Seasonal trends
- Supplier performance

### Production Reports

#### Batch Consistency

- Compare batches of same recipe
- Yield variance analysis
- Quality metrics tracking
- Process improvement insights

#### Efficiency Metrics

- Actual vs. expected yields
- Production time analysis
- Resource utilization
- Waste tracking

### Financial Reports

#### Cost Analysis

- Cost per batch
- Ingredient cost trends
- Profitability by product
- Budget vs. actual spending

## Subscription Management

### Viewing Current Plan

1. Navigate to **Settings** > **Subscription**
2. View current plan details:
   - Plan name and features
   - User limits
   - Billing cycle
   - Next billing date

### Usage Monitoring

- Track current usage vs. plan limits
- Monitor user count
- Review feature usage
- Receive notifications near limits

### Upgrading/Downgrading

1. Go to **Subscription** > **Change Plan**
2. Compare available plans
3. Select new plan
4. Confirm billing changes
5. Plan changes take effect immediately

### Billing Management

1. View billing history
2. Update payment methods
3. Download invoices
4. Set up automatic payments

## Troubleshooting

### Common Issues

#### Login Problems

- **Forgot Password**: Use "Forgot Password" link
- **Account Locked**: Contact administrator
- **Browser Issues**: Clear cache and cookies

#### Inventory Discrepancies

- **Stock Levels Wrong**: Perform inventory adjustment
- **Missing Items**: Check if items were moved or used
- **Duplicate Entries**: Contact support for cleanup

#### Performance Issues

- **Slow Loading**: Check internet connection
- **Timeouts**: Refresh page and try again
- **Browser Compatibility**: Use supported browser

### Getting Help

#### In-App Support

- Click **Help** icon in navigation
- Access knowledge base articles
- Submit support tickets

#### Contact Information

- **Email Support**: support@breweryinventory.com
- **Phone Support**: Available during business hours
- **Live Chat**: Available for premium plans

#### Training Resources

- **Video Tutorials**: Step-by-step guides
- **Webinars**: Live training sessions
- **Documentation**: Comprehensive guides

### System Status

- Check system status page for outages
- Subscribe to status updates
- Planned maintenance notifications

---

## Quick Reference

### Keyboard Shortcuts

- `Ctrl/Cmd + K`: Quick search
- `Ctrl/Cmd + N`: New item (context-dependent)
- `Ctrl/Cmd + S`: Save current form
- `Esc`: Close modal/cancel action

### Mobile Access

- Responsive design works on tablets
- Core features available on mobile browsers
- QR code scanning optimized for mobile

### Data Export

- Most reports can be exported to Excel/PDF
- Bulk data export available for admins
- API access for custom integrations

---

_Last updated: [Current Date]_
_Version: 1.0_

For the most up-to-date information, please refer to the online help system within the application.
