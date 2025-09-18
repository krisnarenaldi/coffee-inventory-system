"use client";

import { useState, useMemo } from "react";
import { Search, BookOpen, ChevronRight, Home } from "lucide-react";
import Link from "next/link";

const userGuideContent = `# Brewery Inventory Management System - User Guide

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
1. Navigate to your brewery's subdomain: \`https://[your-brewery].breweryinventory.com\`
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
- \`Ctrl/Cmd + K\`: Quick search
- \`Ctrl/Cmd + N\`: New item (context-dependent)
- \`Ctrl/Cmd + S\`: Save current form
- \`Esc\`: Close modal/cancel action

### Mobile Access
- Responsive design works on tablets
- Core features available on mobile browsers
- QR code scanning optimized for mobile

### Data Export
- Most reports can be exported to Excel/PDF
- Bulk data export available for admins
- API access for custom integrations

---

*Last updated: [Current Date]*
*Version: 1.0*

For the most up-to-date information, please refer to the online help system within the application.`;

interface Section {
  id: string;
  title: string;
  content: string;
  level: number;
}

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("");

  // Parse markdown content into sections
  const sections = useMemo(() => {
    const lines = userGuideContent.split("\n");
    const parsedSections: Section[] = [];
    let currentSection: Section | null = null;
    let contentBuffer: string[] = [];

    lines.forEach((line, index) => {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = contentBuffer.join("\n").trim();
          parsedSections.push(currentSection);
        }

        // Start new section
        const level = headerMatch[1].length;
        const title = headerMatch[2];
        const id = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        currentSection = {
          id,
          title,
          content: "",
          level,
        };
        contentBuffer = [];
      } else {
        contentBuffer.push(line);
      }
    });

    // Don't forget the last section
    if (currentSection) {
      (currentSection as Section).content = contentBuffer.join("\n").trim();
      parsedSections.push(currentSection as Section);
    }

    return parsedSections;
  }, []);

  // Filter sections based on search term
  const filteredSections = useMemo(() => {
    if (!searchTerm) return sections;

    return sections.filter(
      (section) =>
        section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sections, searchTerm]);

  // Generate table of contents
  const tableOfContents = useMemo(() => {
    return sections.filter((section) => section.level <= 3);
  }, [sections]);

  const formatContent = (content: string): string => {
    // Simple markdown to HTML conversion
    return content
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(
        /`(.+?)`/g,
        '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>'
      )
      .replace(
        /\[([^\]]+)\]\((#[^)]+)\)/g,
        '<a href="$2" class="text-amber-600 hover:text-amber-700 underline transition-colors cursor-pointer" onclick="document.getElementById(\'$2\'.substring(1))?.scrollIntoView({behavior: \'smooth\'});">$1</a>'
      )
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(
        /((?:<li>.*<\/li>\n?)+)/g,
        '<ul class="list-disc list-inside ml-4 space-y-1">$1</ul>'
      )
      .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
      .replace(
        /((?:<li>.*<\/li>\n?)+)/g,
        '<ol class="list-decimal list-inside ml-4 space-y-1">$1</ol>'
      )
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/^(.+)$/gm, '<p class="mb-4">$1</p>');
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveSection(sectionId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 text-amber-100 mb-2">
            <Link href="/" className="hover:text-white transition-colors">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Help & Documentation</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Help & Documentation</h1>
          <p className="text-amber-100">
            Comprehensive guide to using the brewery inventory system
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <div className="sticky top-8">
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search documentation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-amber-200 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-lg transition-all"
                  />
                </div>
              </div>

              {/* Table of Contents */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/20 p-6">
                <h3 className="font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">
                  Table of Contents
                </h3>
                <nav className="space-y-1">
                  {tableOfContents.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-amber-50 cursor-pointer transition-all duration-200 ${
                        activeSection === section.id
                          ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-l-4 border-amber-500"
                          : "text-gray-600 hover:text-amber-700"
                      } ${
                        section.level === 2
                          ? "ml-3"
                          : section.level === 3
                          ? "ml-6"
                          : ""
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/20">
              <div className="p-8">
                {filteredSections.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
                      No results found
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your search terms or browse the table of
                      contents.
                    </p>
                  </div>
                ) : (
                  <div className="prose prose-lg max-w-none">
                    {filteredSections.map((section) => (
                      <div key={section.id} id={section.id} className="mb-8">
                        <h2
                          className={`font-bold mb-4 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent ${
                            section.level === 1
                              ? "text-3xl"
                              : section.level === 2
                              ? "text-2xl"
                              : section.level === 3
                              ? "text-xl"
                              : section.level === 4
                              ? "text-lg"
                              : "text-base"
                          }`}
                        >
                          {section.title}
                        </h2>
                        <div
                          className="text-gray-700 leading-relaxed prose prose-amber max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: formatContent(section.content ?? ""),
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
