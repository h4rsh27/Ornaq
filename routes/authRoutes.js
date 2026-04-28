import express from "express";
import rateLimit from "express-rate-limit";
import { body } from "express-validator";
import {
  forgotPassword,
  getProfile,
  googleLogin,
  login,
  register,
  requestOtp,
  resetPassword,
  verifyOtp
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 15 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production"
});

router.post(
  "/register",
  authLimiter,
  [
    body("name").trim().notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("phone").optional().isString()
  ],
  validateRequest,
  register
);

router.post("/login", authLimiter, [body("email").isEmail(), body("password").isLength({ min: 6 })], validateRequest, login);
router.post("/request-otp", authLimiter, [body("phone").isString().notEmpty()], validateRequest, requestOtp);
router.post("/verify-otp", authLimiter, [body("phone").isString().notEmpty(), body("otp").isLength({ min: 4 })], validateRequest, verifyOtp);
router.post("/google", authLimiter, [body("email").isEmail(), body("name").isString().notEmpty()], validateRequest, googleLogin);
router.post("/forgot-password", authLimiter, [body("email").isEmail()], validateRequest, forgotPassword);
router.post(
  "/reset-password",
  authLimiter,
  [body("token").isString().notEmpty(), body("password").isLength({ min: 6 })],
  validateRequest,
  resetPassword
);
router.get("/profile", protect, getProfile);
router.get("/me", protect, getProfile);

export default router;
