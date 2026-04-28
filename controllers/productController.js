import { StatusCodes } from "http-status-codes";
import Product from "../models/Product.js";
import { getProductDiscovery } from "../services/recommendationService.js";
import { isServiceablePincode } from "../utils/serviceability.js";
import {
  buildProductUrl,
  buildVariantPayload,
  calculateDiscountPrice,
  calculatePopularityScore,
  escapeRegex,
  getEffectivePrice,
  isNewArrivalActive,
  normalizeColorList,
  toSlug
} from "../utils/productUtils.js";

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const parseNumber = (value, fallback) => {
  if (value === "" || value === undefined || value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
};

const parseArrayInput = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const parseVariantsInput = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const buildExactMatch = (value) => {
  const options = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!options.length) return undefined;
  if (options.length === 1) {
    return { $regex: `^${escapeRegex(options[0])}$`, $options: "i" };
  }

  return {
    $in: options.map((item) => new RegExp(`^${escapeRegex(item)}$`, "i"))
  };
};

const resolveSort = (sort) =>
  (
    {
      newest: "-createdAt",
      oldest: "createdAt",
      priceAsc: "price",
      priceDesc: "-price",
      trending: "-popularityScore -views",
      bestselling: "-soldCount -analytics.purchases",
      popularity: "-popularityScore -views"
    }[sort]
  ) || "-createdAt";

const sanitizeImages = (images = []) =>
  Array.isArray(images)
    ? images
        .filter(Boolean)
        .map((image) => ({
          url: image.url || image.secure_url || "",
          publicId: image.publicId || image.public_id || ""
        }))
        .filter((image) => image.url)
    : [];

const withPopularity = (product) => {
  const popularityScore = calculatePopularityScore(product);
  return {
    ...product,
    popularityScore,
    interestScore: popularityScore
  };
};

const formatProduct = (product) => {
  const doc = typeof product.toObject === "function" ? product.toObject() : { ...product };
  const colors = normalizeColorList(doc.colors, doc.color);
  const variants =
    Array.isArray(doc.variants) && doc.variants.length
      ? doc.variants
      : buildVariantPayload({
          colors,
          variants: [],
          images: sanitizeImages(doc.images),
          name: doc.name,
          stock: doc.stock
        });

  return withPopularity({
    ...doc,
    color: doc.color || colors[0] || "Multicolor",
    colors,
    variants,
    images: sanitizeImages(doc.images),
    analytics: {
      views: Number(doc.analytics?.views ?? doc.views ?? 0),
      cartAdds: Number(doc.analytics?.cartAdds ?? 0),
      wishlistAdds: Number(doc.analytics?.wishlistAdds ?? 0),
      purchases: Number(doc.analytics?.purchases ?? doc.soldCount ?? 0)
    },
    effectivePrice: getEffectivePrice(doc),
    isNewArrival: isNewArrivalActive(doc)
  });
};

const buildProductPayload = (body, previousProduct) => {
  const name = normalizeString(body.name) || previousProduct?.name;
  const slug = toSlug(name);
  const productUrl = buildProductUrl(slug);
  const createdAt = body.createdAt || previousProduct?.createdAt || Date.now();
  const price = parseNumber(body.price, previousProduct?.price ?? 0);
  const discount = Math.max(
    0,
    parseNumber(body.discount ?? body.discountPercent, previousProduct?.discount ?? previousProduct?.discountPercent ?? 0)
  );
  const images = sanitizeImages(Array.isArray(body.images) ? body.images : previousProduct?.images || []);
  const colors = normalizeColorList(parseArrayInput(body.colors), body.color || previousProduct?.color || "");
  const variants = buildVariantPayload({
    colors,
    variants: parseVariantsInput(body.variants),
    images,
    name,
    stock: parseNumber(body.stock, previousProduct?.stock ?? 0)
  });
  const computedStock =
    body.stock === undefined && body.variants
      ? variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0)
      : Math.max(0, parseNumber(body.stock, previousProduct?.stock ?? 0));
  const isNewArrival = parseBoolean(body.isNewArrival, previousProduct?.isNewArrival ?? false);
  const tags = Array.from(
    new Set([
      ...(parseArrayInput(body.tags).length ? parseArrayInput(body.tags) : previousProduct?.tags || []),
      ...(isNewArrival ? ["new-arrival"] : []),
      ...(parseBoolean(body.featured, previousProduct?.featured ?? false) ? ["featured"] : [])
    ])
  );

  const payload = {
    ...body,
    name,
    slug,
    description: normalizeString(body.description) || previousProduct?.description || "",
    category: normalizeString(body.category) || previousProduct?.category || "Silk",
    fabric: normalizeString(body.fabric) || previousProduct?.fabric || "Soft Silk",
    color: colors[0] || normalizeString(body.color) || previousProduct?.color || "Multicolor",
    colors,
    variants,
    price,
    discount,
    discountPercent: discount,
    discountPrice: calculateDiscountPrice(price, discount),
    stock: computedStock,
    images,
    featured: parseBoolean(body.featured, previousProduct?.featured ?? false),
    isNewArrival,
    newArrivalExpiresAt:
      body.newArrivalExpiresAt ||
      previousProduct?.newArrivalExpiresAt ||
      (isNewArrival ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 45) : undefined),
    deliveryEstimate: {
      minDays: Math.max(
        1,
        parseNumber(body.deliveryEstimate?.minDays ?? body.deliveryEstimateMinDays, previousProduct?.deliveryEstimate?.minDays ?? 3)
      ),
      maxDays: Math.max(
        1,
        parseNumber(body.deliveryEstimate?.maxDays ?? body.deliveryEstimateMaxDays, previousProduct?.deliveryEstimate?.maxDays ?? 5)
      )
    },
    serviceablePincodes: parseArrayInput(body.serviceablePincodes).length
      ? parseArrayInput(body.serviceablePincodes)
      : previousProduct?.serviceablePincodes || [],
    tags,
    analytics: previousProduct?.analytics || {
      views: 0,
      cartAdds: 0,
      wishlistAdds: 0,
      purchases: previousProduct?.soldCount || 0
    },
    popularityScore: parseNumber(body.popularityScore, previousProduct?.popularityScore ?? 0),
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(productUrl)}`
  };

  payload.popularityScore = calculatePopularityScore(payload);
  return payload;
};

export const createProduct = async (req, res) => {
  const product = await Product.create(buildProductPayload(req.body));
  const formatted = formatProduct(product);
  req.io.emit("product:created", formatted);
  res.status(StatusCodes.CREATED).json(formatted);
};

export const updateProduct = async (req, res) => {
  const existingProduct = await Product.findById(req.params.id);
  if (!existingProduct) return res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });

  const product = await Product.findByIdAndUpdate(req.params.id, buildProductPayload(req.body, existingProduct), {
    new: true,
    runValidators: true
  });
  const formatted = formatProduct(product);
  req.io.emit("product:updated", formatted);
  req.io.emit("stock:updated", { productId: product._id, stock: product.stock });
  res.json(formatted);
};

export const updateStock = async (req, res) => {
  const stock = Math.max(0, Number(req.body.stock || 0));
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        stock,
        "variants.$[].stock": stock
      }
    },
    { new: true }
  );
  if (!product) return res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });
  req.io.emit("stock:updated", { productId: product._id, stock: product.stock });
  res.json(formatProduct(product));
};

export const adjustStock = async (req, res) => {
  const delta = Number(req.body.delta || 0);
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });

  product.stock = Math.max(0, product.stock + delta);
  if (Array.isArray(product.variants) && product.variants.length) {
    const targetIndex = product.variants.findIndex((variant) => Number(variant.stock || 0) > 0);
    if (targetIndex >= 0) {
      product.variants[targetIndex].stock = Math.max(0, Number(product.variants[targetIndex].stock || 0) + delta);
    }
  }
  product.popularityScore = calculatePopularityScore(product);
  await product.save();
  req.io.emit("stock:updated", { productId: product._id, stock: product.stock });
  res.json(formatProduct(product));
};

export const bulkUploadProductsCsv = async (req, res) => {
  if (!req.file?.buffer) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "CSV file is required" });
  }
  const csv = req.file.buffer.toString("utf-8");
  const rows = csv.split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "CSV must include header + rows" });
  }

  const [header, ...dataRows] = rows;
  const headers = header.split(",").map((item) => item.trim());
  const created = [];

  for (const row of dataRows) {
    const values = row.split(",").map((item) => item.trim());
    const rowData = Object.fromEntries(headers.map((headerItem, index) => [headerItem, values[index] ?? ""]));
    if (!rowData.name) continue;
    const product = await Product.create(
      buildProductPayload({
        ...rowData,
        colors: rowData.colors,
        featured: rowData.featured === "true",
        isNewArrival: rowData.isNewArrival === "true"
      })
    );
    created.push(formatProduct(product));
  }

  req.io.emit("products:bulk-created", { count: created.length });
  return res.status(StatusCodes.CREATED).json({ createdCount: created.length, products: created });
};

export const deleteProduct = async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });
  req.io.emit("product:deleted", { id: req.params.id });
  res.status(StatusCodes.NO_CONTENT).send();
};

export const getProducts = async (req, res) => {
  const {
    category,
    color,
    fabric,
    searchQuery,
    q,
    isNewArrival,
    featured,
    excludeId,
    limit,
    minPrice = 0,
    maxPrice = Number.MAX_SAFE_INTEGER,
    sort = "newest"
  } = req.query;
  const nameSearch = normalizeString(searchQuery || q);
  const filter = {
    price: {
      $gte: Math.max(0, parseNumber(minPrice, 0)),
      $lte: parseNumber(maxPrice, Number.MAX_SAFE_INTEGER)
    },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    ...(nameSearch
      ? {
          $or: [
            { name: { $regex: escapeRegex(nameSearch), $options: "i" } },
            { fabric: { $regex: escapeRegex(nameSearch), $options: "i" } },
            { category: { $regex: escapeRegex(nameSearch), $options: "i" } },
            { colors: { $regex: escapeRegex(nameSearch), $options: "i" } }
          ]
        }
      : {}),
    ...(category ? { category: buildExactMatch(category) } : {}),
    ...(fabric ? { fabric: buildExactMatch(fabric) } : {}),
    ...(parseBoolean(isNewArrival, false) ? { isNewArrival: true } : {}),
    ...(featured !== undefined ? { featured: parseBoolean(featured, false) } : {})
  };

  if (color) {
    const colorMatcher = buildExactMatch(color);
    filter.$and = [{ $or: [{ color: colorMatcher }, { colors: colorMatcher }] }];
  }

  const query = Product.find(filter).sort(resolveSort(sort));
  if (limit) {
    query.limit(Math.max(1, Number(limit)));
  }

  const products = (await query.lean()).map(formatProduct).filter((product) => (!parseBoolean(isNewArrival, false) ? true : product.isNewArrival));
  const lowStockCount = products.filter((product) => product.stock <= 5).length;
  res.json(products);
  if (lowStockCount) {
    req.io.emit("inventory:low-stock", { lowStockCount });
  }
};

export const getProductFilters = async (_req, res) => {
  const [categories, fabrics, colors] = await Promise.all([
    Product.distinct("category"),
    Product.distinct("fabric"),
    Product.distinct("colors")
  ]);
  res.json({
    categories: categories.filter(Boolean).sort((left, right) => left.localeCompare(right)),
    fabrics: fabrics.filter(Boolean).sort((left, right) => left.localeCompare(right)),
    colors: colors.filter(Boolean).sort((left, right) => left.localeCompare(right))
  });
};

export const getSearchSuggestions = async (req, res) => {
  const query = normalizeString(req.query.q);
  if (query.length < 2) {
    return res.json([]);
  }

  const suggestions = await Product.find({
    $or: [
      { name: { $regex: escapeRegex(query), $options: "i" } },
      { category: { $regex: escapeRegex(query), $options: "i" } },
      { fabric: { $regex: escapeRegex(query), $options: "i" } }
    ]
  })
    .select("name slug category fabric color colors price discountPrice discountPercent images isNewArrival")
    .limit(8)
    .lean();

  res.json(suggestions.map(formatProduct));
};

export const checkServiceability = async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });
  }
  res.json(isServiceablePincode(req.params.pincode, product));
};

export const getProductBySlug = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { slug: req.params.slug },
    { $inc: { views: 1, "analytics.views": 1 } },
    { new: true }
  ).lean();
  if (!product) return res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });

  const formatted = formatProduct(product);
  await Product.findByIdAndUpdate(product._id, { $set: { popularityScore: formatted.popularityScore } });
  res.json(formatted);
};

export const getTrending = async (_req, res) => {
  const products = (await Product.find().sort({ popularityScore: -1, soldCount: -1, views: -1 }).limit(8).lean()).map(formatProduct);
  res.json(products);
};

export const getNewArrivals = async (_req, res) => {
  const newArrivals = (await Product.find({ isNewArrival: true }).sort({ createdAt: -1 }).limit(8).lean()).map(formatProduct);
  res.json(newArrivals.filter((product) => product.isNewArrival));
};

export const getHomeFeed = async (_req, res) => {
  const [newArrivals, trending, featured] = await Promise.all([
    Product.find({ isNewArrival: true }).sort({ createdAt: -1 }).limit(8).lean(),
    Product.find().sort({ popularityScore: -1, soldCount: -1, views: -1 }).limit(8).lean(),
    Product.find({ featured: true }).sort({ createdAt: -1 }).limit(8).lean()
  ]);

  res.json({
    newArrivals: newArrivals.map(formatProduct).filter((product) => product.isNewArrival),
    trending: trending.map(formatProduct),
    recommended: featured.map(formatProduct)
  });
};

export const getRecommendations = async (req, res) => {
  const discovery = await getProductDiscovery(req.params.id);
  if (!discovery) return res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });
  res.json(discovery.recommendedProducts);
};

export const getProductDiscoveryFeed = async (req, res) => {
  const discovery = await getProductDiscovery(req.params.id);
  if (!discovery) return res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });
  res.json(discovery);
};
