/**
 * Centralized Permission Matrix
 * Each role maps to an array of permission strings.
 * Extend this object — never hardcode role checks in business logic.
 */

const ROLES = {
  SUPER_ADMIN: "super_admin",
  ORDER_MANAGER: "order_manager",
  INVENTORY_MANAGER: "inventory_manager",
  CONTENT_MANAGER: "content_manager",
  MARKETING_MANAGER: "marketing_manager",
  CUSTOMER: "customer",
};

const PERMISSIONS = {
  // User & Access Management
  MANAGE_USERS: "manage_users",
  VIEW_USERS: "view_users",
  BLOCK_USERS: "block_users",
  EXPORT_USERS: "export_users",
  VIEW_AUDIT_LOGS: "view_audit_logs",

  // Orders
  VIEW_ORDERS: "view_orders",
  UPDATE_ORDERS: "update_orders",
  EXPORT_ORDERS: "export_orders",
  MANAGE_REFUNDS: "manage_refunds",
  VIEW_TRACKING: "view_tracking",

  // Products & Inventory
  MANAGE_PRODUCTS: "manage_products",
  MANAGE_CATEGORIES: "manage_categories",
  MANAGE_STOCK: "manage_stock",

  // Content
  MANAGE_BLOGS: "manage_blogs",
  MANAGE_BANNERS: "manage_banners",
  MANAGE_SEO: "manage_seo",
  MANAGE_SLIDERS: "manage_sliders",
  MANAGE_ACHIEVEMENTS: "manage_achievements",

  // Marketing
  MANAGE_COUPONS: "manage_coupons",
  VIEW_ANALYTICS: "view_analytics",
  MANAGE_CAMPAIGNS: "manage_campaigns",

  // Storefront (all authenticated users)
  VIEW_STOREFRONT: "view_storefront",
};

const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // Full access

  [ROLES.ORDER_MANAGER]: [
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.UPDATE_ORDERS,
    PERMISSIONS.EXPORT_ORDERS,
    PERMISSIONS.MANAGE_REFUNDS,
    PERMISSIONS.VIEW_TRACKING,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_STOREFRONT,
  ],

  [ROLES.INVENTORY_MANAGER]: [
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.MANAGE_STOCK,
    PERMISSIONS.VIEW_STOREFRONT,
  ],

  [ROLES.CONTENT_MANAGER]: [
    PERMISSIONS.MANAGE_BLOGS,
    PERMISSIONS.MANAGE_BANNERS,
    PERMISSIONS.MANAGE_SEO,
    PERMISSIONS.MANAGE_SLIDERS,
    PERMISSIONS.MANAGE_ACHIEVEMENTS,
    PERMISSIONS.VIEW_STOREFRONT,
  ],

  [ROLES.MARKETING_MANAGER]: [
    PERMISSIONS.MANAGE_COUPONS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_CAMPAIGNS,
    PERMISSIONS.VIEW_STOREFRONT,
  ],

  [ROLES.CUSTOMER]: [PERMISSIONS.VIEW_STOREFRONT],
};

/**
 * Check if a role has a specific permission
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}

/**
 * Get all permissions for a role
 * @param {string} role
 * @returns {string[]}
 */
function getPermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

module.exports = { ROLES, PERMISSIONS, ROLE_PERMISSIONS, hasPermission, getPermissions };
