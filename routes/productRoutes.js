import express from "express";
import multer from "multer";
import { body } from "express-validator";
import {
  adjustStock,
  bulkUploadProductsCsv,
  checkServiceability,
  createProduct,
  deleteProduct,
  getHomeFeed,
  getNewArrivals,
  getProductBySlug,
  getProductDiscoveryFeed,
  getProductFilters,
  getProducts,
  getRecommendations,
  getSearchSuggestions,
  getTrending,
  updateProduct,
  updateStock
} from "../controllers/productController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const productValidation = [
  body("name").trim().notEmpty(),
  body("price").isFloat({ min: 0 }),
  body("fabric").trim().notEmpty(),
  body("category").trim().notEmpty(),
  body("color").optional().trim(),
  body("description").trim().notEmpty(),
  body("stock").isInt({ min: 0 }),
  body("discountPercent").optional().isFloat({ min: 0, max: 90 }),
  body("images").optional().isArray()
];

router.get("/filters/meta", getProductFilters);
router.get("/suggestions", getSearchSuggestions);
router.get("/home-feed", getHomeFeed);
router.get("/new-arrivals", getNewArrivals);
router.get("/trending", getTrending);
router.get("/discovery/:id", getProductDiscoveryFeed);
router.get("/recommendations/:id", getRecommendations);
router.get("/:id/serviceability/:pincode", checkServiceability);
router.get("/", getProducts);
router.get("/:slug", getProductBySlug);

router.post("/", protect, authorize("admin"), productValidation, validateRequest, createProduct);
router.post("/bulk-upload-csv", protect, authorize("admin"), upload.single("file"), bulkUploadProductsCsv);
router.patch("/:id", protect, authorize("admin"), updateProduct);
router.patch("/:id/stock", protect, authorize("admin"), [body("stock").isInt({ min: 0 })], validateRequest, updateStock);
router.patch("/:id/stock/adjust", protect, authorize("admin"), [body("delta").isInt()], validateRequest, adjustStock);
router.delete("/:id", protect, authorize("admin"), deleteProduct);

export default router;
