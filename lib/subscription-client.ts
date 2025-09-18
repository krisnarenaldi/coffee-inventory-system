// Client-side subscription utilities that work in browser environment

export async function checkFeatureAccess(feature: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/subscription/features?feature=${encodeURIComponent(feature)}`);
    
    if (!response.ok) {
      console.error('Failed to check feature access:', response.statusText);
      return false;
    }
    
    const data = await response.json();
    return data.hasAccess || false;
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
}

export async function checkMultipleFeatureAccess(features: string[]): Promise<Record<string, boolean>> {
  try {
    const response = await fetch('/api/subscription/features', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ features }),
    });
    
    if (!response.ok) {
      console.error('Failed to check multiple feature access:', response.statusText);
      return features.reduce((acc, feature) => ({ ...acc, [feature]: false }), {});
    }
    
    const data = await response.json();
    return data.features || features.reduce((acc, feature) => ({ ...acc, [feature]: false }), {});
  } catch (error) {
    console.error('Error checking multiple feature access:', error);
    return features.reduce((acc, feature) => ({ ...acc, [feature]: false }), {});
  }
}