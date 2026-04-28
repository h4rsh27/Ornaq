import express from "express";
import { body } from "express-validator";
import { createReview, getReviewsByProduct } from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = express.Router();

router.post(
  "/",
  protect,
  [
    body("productId").notEmpty(),
    body("rating").isInt({ min: 1, max: 5 }),
    body("title").optional().isString(),
    body("comment").optional().isString(),
    body("images").optional().isArray()
  ],
  validateRequest,
  createReview
);
router.get("/:productId", getReviewsByProduct);

export default router;
