import express from "express";
import { body } from "express-validator";
import {
  cancelOrder,
  createOrder,
  getInvoice,
  getMyOrders,
  getOrderById,
  getOrders,
  reorderOrder,
  requestReturn,
  updateOrderStatus
} from "../controllers/orderController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = express.Router();

router.post(
  "/",
  protect,
  [
    body("items").isArray({ min: 1 }),
    body("paymentMethod").optional().isIn(["COD", "MOCK", "RAZORPAY", "STRIPE"]),
    body("shippingAddress").isObject()
  ],
  validateRequest,
  createOrder
);
router.get("/user", protect, getMyOrders);
router.get("/my-orders", protect, getMyOrders);
router.get("/", protect, authorize("admin"), getOrders);
router.post("/cancel", protect, [body("orderId").notEmpty(), body("reason").optional().isString()], validateRequest, cancelOrder);
router.post("/return", protect, [body("orderId").notEmpty(), body("reason").optional().isString()], validateRequest, requestReturn);
router.post("/:id/reorder", protect, reorderOrder);
router.get("/:id/invoice", protect, getInvoice);
router.get("/:id", protect, getOrderById);
router.post("/:id/cancel", protect, [body("reason").optional().isString()], validateRequest, cancelOrder);
router.post("/:id/return", protect, [body("reason").optional().isString()], validateRequest, requestReturn);
router.patch(
  "/:id/status",
  protect,
  authorize("admin"),
  [
    body("orderStatus").isIn([
      "PLACED",
      "CONFIRMED",
      "PACKED",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "PAYMENT_FAILED",
      "CANCELLED"
    ]),
    body("note").optional().isString()
  ],
  validateRequest,
  updateOrderStatus
);

export default router;
