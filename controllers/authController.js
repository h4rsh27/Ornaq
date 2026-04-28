import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import User from "../models/User.js";
import { sendEmail } from "../services/emailService.js";
import { sendCustomerNotification } from "../services/notificationService.js";
import { generateToken } from "../utils/generateToken.js";

const normalizeRole = (role) => String(role || "").toLowerCase();

const serializeUser = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  role: user.role,
  avatar: user.avatar || "",
  authProviders: user.authProviders || [],
  addresses: user.addresses || []
});

const buildAuthResponse = (user, extra = {}) => ({
  user: serializeUser(user),
  token: generateToken(user),
  ...extra
});

const ensureProvider = (user, provider) => {
  const set = new Set(user.authProviders || []);
  set.add(provider);
  user.authProviders = Array.from(set);
};

const buildOtpHash = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export const register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Email already registered" });
  }
  const user = await User.create({
    name,
    email,
    password,
    phone,
    authProviders: ["password"]
  });
  return res.status(StatusCodes.CREATED).json(buildAuthResponse(user));
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid credentials" });
  }
  return res.status(StatusCodes.OK).json(buildAuthResponse(user));
};

export const requestOtp = async (req, res) => {
  const normalizedPhone = String(req.body.phone || "").trim();
  if (!/^\d{10}$/.test(normalizedPhone)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Enter a valid 10-digit mobile number." });
  }

  let user = await User.findOne({ phone: normalizedPhone });
  if (!user) {
    user = await User.create({
      name: req.body.name || `Ornac Customer ${normalizedPhone.slice(-4)}`,
      email: req.body.email || `mobile-${normalizedPhone}@ornac.local`,
      phone: normalizedPhone,
      authProviders: ["mobile_otp"]
    });
  }

  const otp = generateOtp();
  user.otpLogin = {
    codeHash: buildOtpHash(otp),
    expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    attempts: 0
  };
  ensureProvider(user, "mobile_otp");
  await user.save();

  await sendCustomerNotification({
    user,
    emailSubject: "Your Ornac OTP",
    emailText: `Your Ornac login OTP is ${otp}. It will expire in 10 minutes.`,
    whatsappTemplate: "login_otp",
    whatsappText: `Your Ornac login OTP is ${otp}. It will expire in 10 minutes.`,
    meta: { purpose: "login_otp" }
  });

  return res.json({
    message: "OTP sent successfully.",
    previewCode: process.env.NODE_ENV !== "production" ? otp : undefined
  });
};

export const verifyOtp = async (req, res) => {
  const normalizedPhone = String(req.body.phone || "").trim();
  const otp = String(req.body.otp || "").trim();

  const user = await User.findOne({ phone: normalizedPhone });
  if (!user?.otpLogin?.codeHash || !user?.otpLogin?.expiresAt) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "OTP not requested or already used." });
  }

  if (new Date(user.otpLogin.expiresAt) < new Date()) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "OTP has expired. Please request a new one." });
  }

  if (user.otpLogin.attempts >= 5) {
    return res.status(StatusCodes.TOO_MANY_REQUESTS).json({ message: "Too many attempts. Please request a new OTP." });
  }

  const isValid = buildOtpHash(otp) === user.otpLogin.codeHash;
  if (!isValid) {
    user.otpLogin.attempts += 1;
    await user.save();
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid OTP." });
  }

  user.otpLogin = undefined;
  ensureProvider(user, "mobile_otp");
  await user.save();

  return res.status(StatusCodes.OK).json(buildAuthResponse(user));
};

export const googleLogin = async (req, res) => {
  const allowMock =
    String(process.env.GOOGLE_LOGIN_ALLOW_MOCK || "false") === "true" || process.env.NODE_ENV !== "production";
  if (!allowMock) {
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      message: "Google login is scaffolded and ready, but it requires environment setup before use."
    });
  }

  const { email, name, googleId, avatar } = req.body;
  if (!email || !name) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Google profile data is required." });
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name,
      email,
      googleId: googleId || `mock-${Date.now()}`,
      avatar,
      authProviders: ["google"]
    });
  } else {
    user.name = user.name || name;
    user.avatar = avatar || user.avatar;
    user.googleId = googleId || user.googleId;
    ensureProvider(user, "google");
    await user.save();
  }

  return res.status(StatusCodes.OK).json(buildAuthResponse(user));
};

export const adminLogin = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid credentials" });
  }

  if (normalizeRole(user.role) !== "admin") {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Admin access required" });
  }

  return res.status(StatusCodes.OK).json(
    buildAuthResponse(user, {
      redirectTo: "/admin/dashboard"
    })
  );
};

export const forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.json({ message: "If that email exists, a reset link has been sent." });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
  await user.save();

  const resetLink = `${(process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "")}/reset-password?token=${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Ornac password",
    text: `Reset your password using this link: ${resetLink}`,
    html: `<p>Reset your password using this link:</p><p><a href="${resetLink}">${resetLink}</a></p>`
  });

  return res.json({ message: "If that email exists, a reset link has been sent." });
};

export const resetPassword = async (req, res) => {
  const hashedToken = crypto.createHash("sha256").update(req.body.token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Reset token is invalid or expired." });
  }

  user.password = req.body.password;
  ensureProvider(user, "password");
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();

  return res.json({ message: "Password reset successful." });
};

export const getProfile = async (req, res) => {
  res.json(serializeUser(req.user));
};
