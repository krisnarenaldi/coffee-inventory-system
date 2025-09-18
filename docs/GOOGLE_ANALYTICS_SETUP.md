# Google Analytics Setup Guide

This guide explains how to set up and use Google Analytics in the Coffee Logica application.

## Setup Instructions

### 1. Create a Google Analytics Account

1. Go to [Google Analytics](https://analytics.google.com/)
2. Sign in with your Google account
3. Click "Start measuring"
4. Create a new account and property
5. Choose "Web" as your platform
6. Enter your website details
7. Copy your **Measurement ID** (format: G-XXXXXXXXXX)

### 2. Configure Environment Variables

Add your Google Analytics Measurement ID to your environment variables:

```bash
# .env.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Important:** The `NEXT_PUBLIC_` prefix is required for client-side access in Next.js.

### 3. Verify Installation

1. Start your development server: `npm run dev`
2. Open your website in a browser
3. Open browser developer tools (F12)
4. Go to the Network tab
5. Look for requests to `googletagmanager.com` - this confirms GA is loading
6. Check the Console tab for any GA-related errors

### 4. Test in Google Analytics

1. Go to your Google Analytics dashboard
2. Navigate to Reports > Realtime
3. Visit your website in another tab
4. You should see real-time visitor data

## Usage

The application includes a utility library (`lib/analytics.ts`) with helper functions for tracking:

### Page Views
```typescript
import { pageview } from '../lib/analytics';

// Track page view
pageview('/contact');
```

### Events
```typescript
import { event, trackFormSubmission, trackButtonClick } from '../lib/analytics';

// Generic event tracking
event({
  action: 'click',
  category: 'button',
  label: 'header-cta',
  value: 1
});

// Form submission tracking
trackFormSubmission('contact_form');

// Button click tracking
trackButtonClick('send_message', 'contact_form');
```

### Custom Events
```typescript
import { trackEvent } from '../lib/analytics';

// Track custom events
trackEvent('video_play', {
  video_title: 'Product Demo',
  video_duration: 120
});
```

## Current Implementation

Google Analytics is currently implemented in:

- **Root Layout** (`src/app/layout.tsx`): GA scripts are loaded globally
- **Contact Page** (`src/app/contact/page.tsx`): Form submissions and button clicks are tracked
- **Analytics Utility** (`lib/analytics.ts`): Helper functions for consistent tracking

## Privacy Considerations

1. **Cookie Consent**: Consider implementing a cookie consent banner
2. **Data Privacy**: Review Google Analytics data retention settings
3. **GDPR Compliance**: Ensure compliance with applicable privacy laws
4. **IP Anonymization**: Consider enabling IP anonymization in GA settings

## Troubleshooting

### GA Not Loading
- Check that `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set correctly
- Verify the Measurement ID format (G-XXXXXXXXXX)
- Check browser console for JavaScript errors
- Ensure ad blockers aren't blocking GA scripts

### Events Not Tracking
- Verify GA is loaded before calling tracking functions
- Check the browser's Network tab for gtag requests
- Use Google Analytics DebugView for real-time debugging
- Ensure event parameters follow GA4 naming conventions

### Development vs Production
- GA will track development traffic by default
- Consider using different GA properties for dev/staging/production
- Use Google Analytics filters to exclude internal traffic

## Best Practices

1. **Consistent Naming**: Use consistent event and parameter naming
2. **Meaningful Events**: Track events that provide business value
3. **Performance**: Avoid tracking too many events to prevent performance issues
4. **Testing**: Test tracking in a staging environment before production
5. **Documentation**: Document custom events and their purposes

## Additional Resources

- [Google Analytics 4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [Next.js Analytics Documentation](https://nextjs.org/docs/basic-features/built-in-css-support#adding-a-global-stylesheet)
- [GA4 Event Reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)