import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

export const getWishlist = async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate("products");
  res.json(wishlist || { user: req.user._id, products: [] });
};

export const toggleWishlistItem = async (req, res) => {
  const { productId } = req.body;
  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  const exists = wishlist.products.some((id) => id.toString() === productId);
  wishlist.products = exists
    ? wishlist.products.filter((id) => id.toString() !== productId)
    : [...wishlist.products, productId];
  await wishlist.save();
  if (!exists) {
    await Product.findByIdAndUpdate(productId, { $inc: { "analytics.wishlistAdds": 1 } });
  }
  res.json(wishlist);
};
