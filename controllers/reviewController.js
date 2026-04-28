import { StatusCodes } from "http-status-codes";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";

const refreshProductRatings = async (productId) => {
  const reviews = await Review.find({ productId }).lean();
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1))
    : 0;

  await Product.findByIdAndUpdate(productId, {
    $set: {
      averageRating,
      totalReviews
    }
  });

  return { averageRating, totalReviews };
};

const hasVerifiedPurchase = async (userId, productId) =>
  Order.exists({
    userId,
    orderStatus: "DELIVERED",
    "items.product": productId
  });

export const createReview = async (req, res) => {
  const { productId, rating, title, comment, images = [] } = req.body;
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });
  }

  const verifiedPurchase = Boolean(await hasVerifiedPurchase(req.user._id, productId));
  const review = await Review.findOneAndUpdate(
    { productId, userId: req.user._id },
    {
      $set: {
        rating,
        title: title || "",
        comment: comment || "",
        images: Array.isArray(images) ? images : [],
        verifiedPurchase
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const stats = await refreshProductRatings(productId);
  req.io.emit("review:updated", { productId, ...stats });
  res.status(StatusCodes.OK).json({ review, ...stats });
};

export const getReviewsByProduct = async (req, res) => {
  const reviews = await Review.find({ productId: req.params.productId })
    .populate("userId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const product = await Product.findById(req.params.productId).select("averageRating totalReviews").lean();
  res.json({
    averageRating: product?.averageRating || 0,
    totalReviews: product?.totalReviews || 0,
    reviews
  });
};
