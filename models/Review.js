import mongoose from "mongoose";

const reviewImageSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, default: "" },
    comment: { type: String, trim: true, default: "" },
    images: [reviewImageSchema],
    verifiedPurchase: { type: Boolean, default: false }
  },
  { timestamps: true }
);

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
