// Google Analytics utility functions

// Google Analytics Measurement ID - replace with your actual GA4 measurement ID
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'GA_MEASUREMENT_ID';

// Check if Google Analytics is available
export const isGAEnabled = () => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function' && GA_MEASUREMENT_ID !== 'GA_MEASUREMENT_ID';
};

// Track page views
export const pageview = (url: string) => {
  if (isGAEnabled()) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

// Track events
export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (isGAEnabled()) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track custom events
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (isGAEnabled()) {
    window.gtag('event', eventName, parameters);
  }
};

// Track form submissions
export const trackFormSubmission = (formName: string) => {
  trackEvent('form_submit', {
    form_name: formName,
  });
};

// Track button clicks
export const trackButtonClick = (buttonName: string, location?: string) => {
  trackEvent('button_click', {
    button_name: buttonName,
    location: location,
  });
};

// Track page engagement
export const trackEngagement = (engagementType: string, value?: number) => {
  trackEvent('engagement', {
    engagement_type: engagementType,
    value: value,
  });
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}