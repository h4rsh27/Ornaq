import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    discountType: { type: String, enum: ["PERCENT", "FLAT"], default: "PERCENT" },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscountAmount: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    startsAt: Date,
    expiresAt: Date
  },
  { timestamps: true }
);

export default mongoose.model("Coupon", couponSchema);
