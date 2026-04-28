import mongoose from "mongoose";

const discountSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    percentage: { type: Number, required: true, min: 0, max: 90 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Discount", discountSchema);
