/**
 * Centralized Application Constants
 * Roshini's Home Products
 */

const ORDER_STATUSES = [
  "Not processed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"];

const PAYMENT_GATEWAYS = ["Braintree", "PhonePe", "PayU", "COD"];

const USER_ROLES = {
  CUSTOMER: 0,
  ADMIN: 1,
};

const PRODUCT_STATUSES = ["Active", "Inactive"];

const REFUND_STATUSES = ["None", "Requested", "Processed"];

module.exports = {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_GATEWAYS,
  USER_ROLES,
  PRODUCT_STATUSES,
  REFUND_STATUSES,
};
