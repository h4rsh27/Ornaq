export const toSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const buildProductUrl = (slug) => {
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
  return `${clientUrl}/product/${slug}`;
};

export const calculateDiscountPrice = (price, discountPercent = 0) => {
  const normalizedPrice = Number(price || 0);
  const normalizedDiscount = Number(discountPercent || 0);
  if (!normalizedDiscount) return normalizedPrice;
  return Math.max(0, Math.round(normalizedPrice * (1 - normalizedDiscount / 100)));
};

export const getEffectivePrice = (product) => Number(product.discountPrice || calculateDiscountPrice(product.price, product.discountPercent));

export const normalizeColorList = (colors = [], fallbackColor = "") => {
  const list = Array.isArray(colors)
    ? colors
    : String(colors || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

  if (fallbackColor) {
    list.unshift(String(fallbackColor).trim());
  }

  return Array.from(new Set(list.filter(Boolean)));
};

export const buildVariantPayload = ({ colors = [], variants = [], images = [], name = "", stock = 0 }) => {
  if (Array.isArray(variants) && variants.length) {
    return variants.map((variant, index) => ({
      color: variant.color,
      hexCode: variant.hexCode || "",
      stock: Number.isFinite(Number(variant.stock)) ? Number(variant.stock) : Math.max(0, Number(stock || 0)),
      sku: variant.sku || `${toSlug(name)}-${index + 1}`,
      images: Array.isArray(variant.images) && variant.images.length ? variant.images : images
    }));
  }

  const normalizedColors = normalizeColorList(colors);
  if (!normalizedColors.length) return [];

  const baseStock = Math.max(0, Number(stock || 0));
  const stockPerColor = normalizedColors.length ? Math.max(1, Math.ceil(baseStock / normalizedColors.length)) : baseStock;

  return normalizedColors.map((color, index) => ({
    color,
    hexCode: "",
    stock: stockPerColor,
    sku: `${toSlug(name)}-${index + 1}`,
    images
  }));
};

export const calculatePopularityScore = (product = {}) => {
  const analytics = product.analytics || {};
  const views = Number(analytics.views ?? product.views ?? 0);
  const cartAdds = Number(analytics.cartAdds ?? 0);
  const wishlistAdds = Number(analytics.wishlistAdds ?? 0);
  const purchases = Number(analytics.purchases ?? product.soldCount ?? 0);
  const averageRating = Number(product.averageRating || 0);
  const newArrivalBoost = product.isNewArrival ? 8 : 0;

  return Math.min(
    100,
    Math.round(views * 0.15 + cartAdds * 1.8 + wishlistAdds * 2.4 + purchases * 4.5 + averageRating * 5 + newArrivalBoost)
  );
};

export const isNewArrivalActive = (product = {}) =>
  Boolean(product.isNewArrival) && (!product.newArrivalExpiresAt || new Date(product.newArrivalExpiresAt) > new Date());
