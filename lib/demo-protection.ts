// Demo account protection utilities

export const DEMO_ACCOUNTS = [
  'admin@kopidemo.com',
  'demo@kopidemo.com',
  // Add more demo accounts here as needed
];

export function isDemoAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEMO_ACCOUNTS.includes(email.toLowerCase());
}

export function isDemoTenant(tenantId: string | null | undefined): boolean {
  // Add specific demo tenant IDs if needed
  const DEMO_TENANT_IDS = [
    'cmh9vtq9400036mxe219kfwqr', // Professional plan demo
    // Add more demo tenant IDs here
  ];
  
  if (!tenantId) return false;
  return DEMO_TENANT_IDS.includes(tenantId);
}

export function getDemoRestrictionMessage(action: string): string {
  return `This action (${action}) is not available in demo mode to protect the demo environment.`;
}

export const DEMO_RESTRICTIONS = {
  // Navigation restrictions
  hideUsers: true,
  hidePasswordChange: true,
  
  // Action restrictions  
  preventDelete: true,
  preventPasswordChange: true,
  preventUserManagement: true,
  preventCriticalSettings: true,
  
  // Show demo notices
  showDemoNotices: true,
} as const;