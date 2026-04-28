import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/Product.js";

const tempImages = [
  "https://cdn.cleak.in/product_images/995b64c7-a3cf-4bd6-b482-4c79845e81b6.webp",
  "https://cdn.cleak.in/variant_images/dbd9c180-243f-4361-bb6a-23e03b866b0a.webp",
  "https://cdn.cleak.in/product_images/5f98c1b6-dd32-4ac1-8ddd-166937d7d739.webp",
  "https://cdn.cleak.in/variant_images/5bed0938-8026-4d36-9cb6-4240801724b4.webp",
  "https://cdn.cleak.in/product_images/81c2efc2-7df6-45e2-ab98-8c9b183ee6c1.webp",
  "https://cdn.cleak.in/variant_images/65ae0238-b8e9-448e-ae0e-cab251f7d9b9.webp",
  "https://cdn.cleak.in/product_images/d9fb3731-a0d6-4417-9839-c048dd734e5e.webp",
  "https://cdn.cleak.in/variant_images/6da43251-9b88-4f57-ae65-0ea0c1a9aea7.webp",
  "https://cdn.cleak.in/product_images/60ed5d2e-4359-4cad-a0ab-f988386b3b36.webp",
  "https://cdn.cleak.in/variant_images/e77139f9-85ef-4797-b2b5-8fc70a78ff09.webp"
];

const addTempImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const products = await Product.find({});
    console.log(`Found ${products.length} products to update.`);

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      // Assign 2-3 images per product circularly
      const startIdx = (i * 2) % tempImages.length;
      const productImages = [
        { url: tempImages[startIdx], publicId: `temp-${i}-1` },
        { url: tempImages[(startIdx + 1) % tempImages.length], publicId: `temp-${i}-2` }
      ];

      product.images = productImages;

      // Also update variants if they exist
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant, vIdx) => {
          variant.images = [
            { url: tempImages[(startIdx + vIdx) % tempImages.length], publicId: `temp-v-${i}-${vIdx}` }
          ];
        });
      }

      await product.save();
      console.log(`Updated product: ${product.name}`);
    }

    console.log("Successfully updated all products with temporary images.");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

addTempImages();
