import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: String,
    image: String,
    qty: { type: Number, min: 1, default: 1 },
    price: Number,
    selectedColor: String,
    sku: String
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [orderItemSchema],
    shippingAddress: {
      name: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String
    },
    paymentMethod: { type: String, enum: ["COD", "MOCK", "RAZORPAY", "STRIPE"], required: true },
    paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED", "REFUNDED"], default: "PENDING" },
    orderStatus: {
      type: String,
      enum: [
        "PLACED",
        "CONFIRMED",
        "PACKED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "PAYMENT_FAILED",
        "CANCELLED"
      ],
      default: "PLACED"
    },
    statusTimeline: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        note: String
      }
    ],
    returnRequest: {
      status: {
        type: String,
        enum: ["NONE", "REQUESTED", "APPROVED", "REJECTED", "COMPLETED"],
        default: "NONE"
      },
      reason: String,
      requestedAt: Date,
      updatedAt: Date
    },
    cancellation: {
      reason: String,
      cancelledAt: Date
    },
    refund: {
      status: {
        type: String,
        enum: ["NONE", "PENDING", "PROCESSED", "REJECTED"],
        default: "NONE"
      },
      amount: { type: Number, min: 0, default: 0 },
      reason: String,
      requestedAt: Date,
      processedAt: Date,
      note: String
    },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0, default: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    invoiceNumber: String,
    transactionId: String,
    razorpayOrderId: String,
    stripePaymentIntentId: String,
    estimatedDeliveryAt: Date
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
