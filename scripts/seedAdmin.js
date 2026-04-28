import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

const run = async () => {
  await connectDB();

  const payload = {
    name: process.env.ADMIN_NAME || "Ornac Admin",
    email: (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "StrongPassword123",
    phone: process.env.ADMIN_PHONE || "",
    role: "admin"
  };

  const existingUser = await User.findOne({ email: payload.email });

  if (!existingUser) {
    await User.create(payload);
    console.log(`Admin created for ${payload.email}`);
  } else {
    existingUser.name = payload.name;
    existingUser.phone = payload.phone;
    existingUser.role = "admin";

    if (process.env.ADMIN_PASSWORD) {
      existingUser.password = process.env.ADMIN_PASSWORD;
    }

    await existingUser.save();
    console.log(`Admin ensured for ${payload.email}`);
  }
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
