import express from "express";
import {
  createRazorpayOrder,
  createStripeIntent,
  stripeWebhook,
  verifyRazorpayPayment
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/stripe/create-intent", createStripeIntent);
router.post("/stripe/webhook", stripeWebhook);
router.post("/razorpay/order", createRazorpayOrder);
router.post("/razorpay/verify", verifyRazorpayPayment);

export default router;
