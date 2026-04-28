import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import User from "../models/User.js";

const normalizeRole = (role) => String(role || "").toLowerCase();

export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid token user" });
    }
    next();
  } catch {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid token" });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.map(normalizeRole).includes(normalizeRole(req.user.role))) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Forbidden" });
  }
  next();
};
