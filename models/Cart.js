import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        qty: { type: Number, default: 1, min: 1 },
        selectedColor: String
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Cart", cartSchema);
