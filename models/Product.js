import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    hexCode: { type: String, default: "" },
    stock: { type: Number, min: 0, default: 0 },
    sku: { type: String, trim: true },
    images: [imageSchema]
  },
  { _id: false }
);

const analyticsSchema = new mongoose.Schema(
  {
    views: { type: Number, default: 0, min: 0 },
    cartAdds: { type: Number, default: 0, min: 0 },
    wishlistAdds: { type: Number, default: 0, min: 0 },
    purchases: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, unique: true, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true, trim: true, index: true },
    fabric: { type: String, required: true, index: true },
    color: { type: String, required: true, index: true },
    colors: [{ type: String, trim: true, index: true }],
    variants: [variantSchema],
    price: { type: Number, required: true, min: 0, index: true },
    discount: { type: Number, default: 0, min: 0, max: 90 },
    discountPercent: { type: Number, default: 0, min: 0, max: 90 },
    discountPrice: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, index: true },
    images: [imageSchema],
    featured: { type: Boolean, default: false, index: true },
    isNewArrival: { type: Boolean, default: false, index: true },
    newArrivalExpiresAt: Date,
    tags: [{ type: String }],
    views: { type: Number, default: 0, index: true },
    soldCount: { type: Number, default: 0, index: true },
    popularityScore: { type: Number, default: 0, min: 0, index: true },
    analytics: { type: analyticsSchema, default: () => ({}) },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    deliveryEstimate: {
      minDays: { type: Number, default: 3, min: 1 },
      maxDays: { type: Number, default: 5, min: 1 }
    },
    serviceablePincodes: [{ type: String }],
    qrCodeUrl: String
  },
  { timestamps: true }
);

productSchema.index({ createdAt: -1 });
productSchema.index({ isNewArrival: 1, createdAt: -1 });
productSchema.index({ name: "text", description: "text", category: "text", fabric: "text" });

export default mongoose.model("Product", productSchema);
