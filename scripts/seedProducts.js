import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { sampleProducts } from "../data/sampleProducts.js";
import Product from "../models/Product.js";
import { buildProductUrl, toSlug } from "../utils/productUtils.js";

const buildPlaceholderImage = (name) => ({
  url: `https://placehold.co/900x1200/f7efe7/5f4633?text=${encodeURIComponent(name)}`,
  publicId: ""
});

const buildSeedDocument = (product) => {
  const slug = toSlug(product.name);
  const productUrl = buildProductUrl(slug);

  return {
    ...product,
    slug,
    discount: product.discount ?? product.discountPercent ?? 0,
    discountPercent: product.discountPercent ?? product.discount ?? 0,
    tags: product.tags?.length ? product.tags : product.featured ? ["featured", "new-arrival"] : ["new-arrival"],
    images: product.images?.length ? product.images : [buildPlaceholderImage(product.name)],
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(productUrl)}`
  };
};

const run = async () => {
  await connectDB();

  const operations = sampleProducts.map((product) => {
    const document = buildSeedDocument(product);

    return {
      updateOne: {
        filter: { slug: document.slug },
        update: { $set: document },
        upsert: true
      }
    };
  });

  const result = await Product.bulkWrite(operations);
  console.log(
    `Products seeded. inserted=${result.upsertedCount || 0} modified=${result.modifiedCount || 0} matched=${result.matchedCount || 0}`
  );
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
