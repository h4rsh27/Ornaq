import express from "express";
import multer from "multer";
import { uploadProductImages, uploadReviewImages } from "../controllers/uploadController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/products", protect, authorize("admin"), upload.array("images", 8), uploadProductImages);
router.post("/reviews", protect, upload.array("images", 4), uploadReviewImages);

export default router;
