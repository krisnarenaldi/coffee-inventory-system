// Client-safe role and permission helpers to avoid bundling server-only auth code

export type UserRole =
  | "PLATFORM_ADMIN"
  | "SUPPORT"
  | "BILLING_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "WAREHOUSE_STAFF"
  | "SALES"
  | "STAFF";

export const hasRole = (
  userRole: UserRole,
  requiredRoles: UserRole[],
): boolean => {
  return requiredRoles.includes(userRole);
};

export const isPlatformAdmin = (userRole: UserRole): boolean => {
  return hasRole(userRole, ["PLATFORM_ADMIN"]);
};

export const isTenantAdmin = (userRole: UserRole): boolean => {
  return hasRole(userRole, ["ADMIN", "MANAGER"]);
};

export const canManageInventory = (userRole: UserRole): boolean => {
  return hasRole(userRole, [
    "ADMIN",
    "MANAGER",
    "WAREHOUSE_STAFF",
    "STAFF",
  ]);
};

export const canManageProducts = (userRole: UserRole): boolean => {
  return hasRole(userRole, ["ADMIN", "MANAGER", "STAFF"]);
};

export const canManagePackagingTypes = (userRole: UserRole): boolean => {
  return hasRole(userRole, ["ADMIN", "MANAGER"]);
};

export const canViewReports = (userRole: UserRole): boolean => {
  return hasRole(userRole, ["ADMIN", "MANAGER", "SALES"]);
};

export const canManageUsers = (userRole: UserRole): boolean => {
  return hasRole(userRole, ["ADMIN"]);
};