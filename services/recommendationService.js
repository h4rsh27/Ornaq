import Order from "../models/Order.js";
import Product from "../models/Product.js";
import {
  calculatePopularityScore,
  getEffectivePrice,
  isNewArrivalActive,
  normalizeColorList
} from "../utils/productUtils.js";

const serialize = (product) => {
  const doc = typeof product.toObject === "function" ? product.toObject() : { ...product };
  const colors = normalizeColorList(doc.colors, doc.color);
  const popularityScore = calculatePopularityScore(doc);

  return {
    ...doc,
    colors,
    popularityScore,
    interestScore: popularityScore,
    isNewArrival: isNewArrivalActive(doc),
    effectivePrice: getEffectivePrice(doc)
  };
};

const scoreCandidate = (candidate, currentProduct) => {
  let score = calculatePopularityScore(candidate);

  if (candidate.category === currentProduct.category) score += 18;
  if (candidate.fabric === currentProduct.fabric) score += 16;

  const currentColors = new Set(normalizeColorList(currentProduct.colors, currentProduct.color));
  const candidateColors = normalizeColorList(candidate.colors, candidate.color);
  const sharedColors = candidateColors.filter((color) => currentColors.has(color)).length;
  score += sharedColors * 6;

  if (candidate.isNewArrival) score += 10;
  return score;
};

export const getProductDiscovery = async (currentProductId) => {
  const currentProduct = await Product.findById(currentProductId).lean();
  if (!currentProduct) return null;

  const candidates = await Product.find({ _id: { $ne: currentProduct._id } }).limit(40).lean();
  const scored = candidates
    .map((candidate) => ({ ...candidate, _score: scoreCandidate(candidate, currentProduct) }))
    .sort((left, right) => right._score - left._score);

  const relatedProducts = scored
    .filter((candidate) => candidate.category === currentProduct.category)
    .slice(0, 6)
    .map(serialize);

  const recommendedProducts = scored.slice(0, 6).map(serialize);

  const togetherAgg = await Order.aggregate([
    { $match: { "items.product": currentProduct._id } },
    { $unwind: "$items" },
    { $match: { "items.product": { $ne: currentProduct._id } } },
    { $group: { _id: "$items.product", count: { $sum: "$items.qty" } } },
    { $sort: { count: -1 } },
    { $limit: 6 }
  ]);

  const togetherIds = togetherAgg.map((entry) => entry._id);
  const togetherProductsRaw = togetherIds.length ? await Product.find({ _id: { $in: togetherIds } }).lean() : [];
  const togetherProductsMap = new Map(togetherProductsRaw.map((product) => [String(product._id), serialize(product)]));
  const frequentlyBoughtTogether = togetherAgg
    .map((entry) => togetherProductsMap.get(String(entry._id)))
    .filter(Boolean);

  return {
    currentProduct: serialize(currentProduct),
    relatedProducts,
    recommendedProducts,
    frequentlyBoughtTogether,
    fallbackRecommendations: scored.slice(0, 8).map(serialize)
  };
};
