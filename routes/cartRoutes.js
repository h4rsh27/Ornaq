import express from "express";
import { clearCart, getCart, removeCartItem, upsertCartItem } from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getCart);
router.post("/", protect, upsertCartItem);
router.post("/item", protect, upsertCartItem);
router.delete("/:productId", protect, removeCartItem);
router.delete("/item/:productId", protect, removeCartItem);
router.delete("/", protect, clearCart);

export default router;
