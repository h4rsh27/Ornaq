export const FREE_SHIPPING_THRESHOLD = 999;
export const STANDARD_SHIPPING_FEE = 50;

export const getShippingFee = (subtotal) => (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE);

export const buildInvoiceNumber = (orderId) => `ORNAC-${String(orderId).slice(-8).toUpperCase()}`;

export const canCancelOrder = (orderStatus) => !["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(orderStatus);

export const canRequestReturn = (orderStatus, returnStatus) =>
  orderStatus === "DELIVERED" && !["REQUESTED", "APPROVED", "COMPLETED"].includes(returnStatus || "NONE");

export const pushStatus = (timeline = [], status, note = "") => [...timeline, { status, note, changedAt: new Date() }];
