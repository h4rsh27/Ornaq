import express from "express";
import { getWishlist, toggleWishlistItem } from "../controllers/wishlistController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getWishlist);
router.post("/", protect, toggleWishlistItem);
router.post("/toggle", protect, toggleWishlistItem);

export default router;
