import { StatusCodes } from "http-status-codes";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { sendCustomerNotification } from "../services/notificationService.js";
import { generateInvoiceBuffer } from "../services/invoiceService.js";
import { processPayment } from "../services/payment/paymentService.js";
import {
  buildInvoiceNumber,
  canCancelOrder,
  canRequestReturn,
  getShippingFee,
  pushStatus
} from "../utils/orderUtils.js";
import { calculatePopularityScore } from "../utils/productUtils.js";
import { isServiceablePincode } from "../utils/serviceability.js";

const STOCK_SENSITIVE_STATUSES = new Set(["CONFIRMED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"]);

const updateVariantStock = (product, selectedColor, delta) => {
  if (!selectedColor || !Array.isArray(product.variants) || !product.variants.length) return;
  const variant = product.variants.find((entry) => entry.color === selectedColor);
  if (variant) {
    variant.stock = Math.max(0, Number(variant.stock || 0) + delta);
  }
};

const restoreStockForOrder = async (order, io) => {
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) continue;
    product.stock += item.qty;
    product.soldCount = Math.max(0, product.soldCount - item.qty);
    product.analytics.purchases = Math.max(0, Number(product.analytics?.purchases || 0) - item.qty);
    updateVariantStock(product, item.selectedColor, item.qty);
    product.popularityScore = calculatePopularityScore(product);
    await product.save();
    io.emit("stock:updated", { productId: product._id, stock: product.stock });
  }
};

const reduceStockForOrder = async (order, io) => {
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product || product.stock < item.qty) {
      throw new Error(`Insufficient stock for ${item.name || item.product}`);
    }

    if (item.selectedColor && Array.isArray(product.variants) && product.variants.length) {
      const variant = product.variants.find((entry) => entry.color === item.selectedColor);
      if (variant && Number(variant.stock || 0) < item.qty) {
        throw new Error(`Insufficient stock for ${item.name || item.selectedColor}`);
      }
    }

    product.stock -= item.qty;
    product.soldCount += item.qty;
    product.analytics.purchases = Number(product.analytics?.purchases || 0) + item.qty;
    updateVariantStock(product, item.selectedColor, -item.qty);
    product.popularityScore = calculatePopularityScore(product);
    await product.save();
    io.emit("stock:updated", { productId: product._id, stock: product.stock });
  }
};

const notifyOrderUpdate = async ({ user, subject, message, template, meta }) => {
  await sendCustomerNotification({
    user,
    emailSubject: subject,
    emailText: message,
    whatsappTemplate: template,
    whatsappText: message,
    meta
  });
};

const serializeOrder = (order) => ({
  ...order.toObject(),
  canCancel: canCancelOrder(order.orderStatus),
  canReturn: canRequestReturn(order.orderStatus, order.returnRequest?.status)
});

const resolveOrderId = (req) => req.params.id || req.body.orderId;

const applyRefund = (order, reason) => {
  if (order.paymentStatus !== "PAID") {
    return;
  }

  order.paymentStatus = "REFUNDED";
  order.refund = {
    status: "PENDING",
    amount: order.totalAmount,
    reason,
    requestedAt: new Date(),
    note: "Refund queued for processing."
  };
};

const buildEstimatedDeliveryDate = (products = []) => {
  const maxDays = Math.max(...products.map((product) => Number(product.deliveryEstimate?.maxDays || 5)), 5);
  const estimated = new Date();
  estimated.setDate(estimated.getDate() + maxDays);
  return estimated;
};

export const createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod } = req.body;
  const normalizedPaymentMethod = paymentMethod || "COD";

  let subtotal = 0;
  const normalizedItems = [];
  const orderedProducts = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product || product.stock < item.qty) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: `Insufficient stock for ${item.product}` });
    }

    const selectedColor = item.selectedColor || product.color || product.colors?.[0] || "";
    const serviceability = isServiceablePincode(shippingAddress?.pincode, product);
    if (!serviceability.available) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: serviceability.message });
    }

    if (selectedColor && Array.isArray(product.variants) && product.variants.length) {
      const variant = product.variants.find((entry) => entry.color === selectedColor);
      if (variant && Number(variant.stock || 0) < item.qty) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: `Selected color is low in stock for ${product.name}` });
      }
    }

    const effectivePrice = product.discountPrice || product.price;
    subtotal += effectivePrice * item.qty;
    orderedProducts.push(product);
    normalizedItems.push({
      product: product._id,
      qty: item.qty,
      name: product.name,
      price: effectivePrice,
      image: product.images?.[0]?.url || item.image || "",
      selectedColor,
      sku:
        product.variants?.find((variant) => variant.color === selectedColor)?.sku ||
        `${String(product.slug || product._id)}-${selectedColor || "default"}`
    });
  }

  const shippingFee = getShippingFee(subtotal);
  const totalAmount = subtotal + shippingFee;

  const order = new Order({
    userId: req.user._id,
    items: normalizedItems,
    shippingAddress,
    paymentMethod: normalizedPaymentMethod,
    subtotal,
    shippingFee,
    discountAmount: 0,
    totalAmount,
    paymentStatus: "PENDING",
    orderStatus: "PLACED",
    estimatedDeliveryAt: buildEstimatedDeliveryDate(orderedProducts),
    statusTimeline: [{ status: "PLACED", note: "Order placed successfully.", changedAt: new Date() }]
  });
  order.invoiceNumber = buildInvoiceNumber(order._id);

  if (normalizedPaymentMethod === "COD") {
    await reduceStockForOrder(order, req.io);
    order.orderStatus = "CONFIRMED";
    order.statusTimeline = pushStatus(order.statusTimeline, "CONFIRMED", "Cash on delivery order confirmed.");
  } else {
    const paymentResult = await processPayment({
      paymentMethod: normalizedPaymentMethod,
      orderData: {
        orderId: order._id,
        userId: req.user._id,
        items: normalizedItems,
        totalAmount
      }
    });

    order.paymentStatus = paymentResult.status;
    order.transactionId = paymentResult.transactionId;
    order.orderStatus = paymentResult.success ? "CONFIRMED" : "PAYMENT_FAILED";
    order.statusTimeline = pushStatus(
      order.statusTimeline,
      paymentResult.success ? "CONFIRMED" : "PAYMENT_FAILED",
      paymentResult.success ? "Mock online payment successful." : "Payment failed."
    );

    if (paymentResult.success) {
      await reduceStockForOrder(order, req.io);
    }
  }

  await order.save();
  await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [] } });

  req.io.to(`user:${req.user._id}`).emit("orderCreated", serializeOrder(order));
  req.io.to(`user:${req.user._id}`).emit("paymentStatusUpdated", {
    orderId: order._id,
    paymentStatus: order.paymentStatus,
    transactionId: order.transactionId || null
  });
  req.io.emit("order:created", serializeOrder(order));

  await notifyOrderUpdate({
    user: req.user,
    subject: "Your Ornac order has been placed",
    message: `Your order ${order.invoiceNumber} has been placed successfully. Total amount: Rs. ${order.totalAmount}.`,
    template: "order_placed",
    meta: { orderId: String(order._id), status: order.orderStatus }
  });

  return res.status(StatusCodes.CREATED).json({
    order: serializeOrder(order),
    payment: {
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: order.paymentStatus,
      transactionId: order.transactionId || null
    }
  });
};

export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort("-createdAt").lean();
  res.json(
    orders.map((order) => ({
      ...order,
      canCancel: canCancelOrder(order.orderStatus),
      canReturn: canRequestReturn(order.orderStatus, order.returnRequest?.status)
    }))
  );
};

export const getOrders = async (req, res) => {
  const filter = {
    ...(req.query.status ? { orderStatus: req.query.status } : {}),
    ...(req.query.paymentStatus ? { paymentStatus: req.query.paymentStatus } : {})
  };
  const orders = await Order.find(filter).populate("userId", "name email phone").sort("-createdAt");
  res.json(orders.map(serializeOrder));
};

export const getOrderById = async (req, res) => {
  const order = await Order.findById(resolveOrderId(req))
    .populate("items.product", "name images")
    .populate("userId", "name email phone");

  if (!order) return res.status(StatusCodes.NOT_FOUND).json({ message: "Order not found" });
  if (String(order.userId._id) !== String(req.user._id) && String(req.user.role).toLowerCase() !== "admin") {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Forbidden" });
  }
  res.json(serializeOrder(order));
};

export const cancelOrder = async (req, res) => {
  const order = await Order.findById(resolveOrderId(req)).populate("userId", "name email phone");
  if (!order) return res.status(StatusCodes.NOT_FOUND).json({ message: "Order not found" });
  if (String(order.userId._id) !== String(req.user._id) && String(req.user.role).toLowerCase() !== "admin") {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Forbidden" });
  }
  if (!canCancelOrder(order.orderStatus)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "This order can no longer be cancelled." });
  }

  const previousStatus = order.orderStatus;
  order.orderStatus = "CANCELLED";
  order.cancellation = {
    reason: req.body.reason || "Cancelled by customer",
    cancelledAt: new Date()
  };
  order.statusTimeline = pushStatus(order.statusTimeline, "CANCELLED", order.cancellation.reason);
  applyRefund(order, order.cancellation.reason);
  if (STOCK_SENSITIVE_STATUSES.has(previousStatus)) {
    await restoreStockForOrder(order, req.io);
  }
  await order.save();

  req.io.to(`user:${order.userId._id}`).emit("order:status-updated", serializeOrder(order));
  req.io.emit("admin:order-updated", serializeOrder(order));

  await notifyOrderUpdate({
    user: order.userId,
    subject: "Your Ornac order has been cancelled",
    message: `Your order ${order.invoiceNumber} has been cancelled.`,
    template: "order_cancelled",
    meta: { orderId: String(order._id), status: order.orderStatus }
  });

  res.json(serializeOrder(order));
};

export const requestReturn = async (req, res) => {
  const order = await Order.findById(resolveOrderId(req)).populate("userId", "name email phone");
  if (!order) return res.status(StatusCodes.NOT_FOUND).json({ message: "Order not found" });
  if (String(order.userId._id) !== String(req.user._id)) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Forbidden" });
  }
  if (!canRequestReturn(order.orderStatus, order.returnRequest?.status)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Return request is not available for this order." });
  }

  order.returnRequest = {
    status: "REQUESTED",
    reason: req.body.reason || "Return requested by customer",
    requestedAt: new Date(),
    updatedAt: new Date()
  };
  order.refund = order.paymentStatus === "PAID"
    ? {
        status: "PENDING",
        amount: order.totalAmount,
        reason: order.returnRequest.reason,
        requestedAt: new Date(),
        note: "Refund will be processed after return approval."
      }
    : order.refund;
  order.statusTimeline = pushStatus(order.statusTimeline, "RETURN_REQUESTED", order.returnRequest.reason);
  await order.save();

  req.io.to(`user:${order.userId._id}`).emit("order:status-updated", serializeOrder(order));
  req.io.emit("admin:order-updated", serializeOrder(order));

  res.json(serializeOrder(order));
};

export const reorderOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(StatusCodes.NOT_FOUND).json({ message: "Order not found" });
  if (String(order.userId) !== String(req.user._id)) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Forbidden" });
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

  for (const item of order.items) {
    const existing = cart.items.find(
      (entry) => entry.product.toString() === item.product.toString() && String(entry.selectedColor || "") === String(item.selectedColor || "")
    );
    if (existing) {
      existing.qty += item.qty;
    } else {
      cart.items.push({
        product: item.product,
        qty: item.qty,
        selectedColor: item.selectedColor || ""
      });
    }
  }

  await cart.save();
  res.json({ message: "Items added back to cart." });
};

export const getInvoice = async (req, res) => {
  const order = await Order.findById(resolveOrderId(req)).populate("userId", "name email");
  if (!order) return res.status(StatusCodes.NOT_FOUND).json({ message: "Order not found" });
  if (String(order.userId._id) !== String(req.user._id) && String(req.user.role).toLowerCase() !== "admin") {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Forbidden" });
  }

  const buffer = await generateInvoiceBuffer(order);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${order.invoiceNumber || buildInvoiceNumber(order._id)}.pdf"`);
  res.send(buffer);
};

export const updateOrderStatus = async (req, res) => {
  const order = await Order.findById(req.params.id).populate("userId", "name email phone");
  if (!order) return res.status(StatusCodes.NOT_FOUND).json({ message: "Order not found" });

  const previousStatus = order.orderStatus;
  order.orderStatus = req.body.orderStatus;
  order.statusTimeline = pushStatus(order.statusTimeline, req.body.orderStatus, req.body.note || "Status updated by admin.");

  if (req.body.orderStatus === "DELIVERED" && order.paymentMethod === "COD") {
    order.paymentStatus = "PAID";
  }

  if (req.body.orderStatus === "CANCELLED") {
    applyRefund(order, req.body.note || "Cancelled by admin");
    if (STOCK_SENSITIVE_STATUSES.has(previousStatus)) {
      await restoreStockForOrder(order, req.io);
    }
  }

  if (req.body.orderStatus === "SHIPPED") {
    await notifyOrderUpdate({
      user: order.userId,
      subject: "Your Ornac order has shipped",
      message: `Your order ${order.invoiceNumber} has shipped and is on the way.`,
      template: "order_shipped",
      meta: { orderId: String(order._id), status: order.orderStatus }
    });
  }

  if (req.body.orderStatus === "DELIVERED") {
    await notifyOrderUpdate({
      user: order.userId,
      subject: "Your Ornac order has been delivered",
      message: `Your order ${order.invoiceNumber} has been delivered successfully.`,
      template: "order_delivered",
      meta: { orderId: String(order._id), status: order.orderStatus }
    });
  }

  await order.save();

  req.io.to(`user:${order.userId._id}`).emit("order:status-updated", serializeOrder(order));
  req.io.emit("admin:order-updated", serializeOrder(order));

  res.json(serializeOrder(order));
};
