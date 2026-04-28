import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, unique: true, lowercase: true, trim: true, sparse: true },
    password: { type: String, minlength: 6 },
    phone: String,
    phoneNumber: { type: String, index: true, sparse: true },
    avatar: String,
    googleId: { type: String, index: true, sparse: true },
    authProviders: [{ type: String, enum: ["password", "mobile_otp", "google"] }],
    otpLogin: {
      codeHash: String,
      expiresAt: Date,
      attempts: { type: Number, default: 0 }
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    addresses: [
      {
        label: String,
        recipientName: String,
        phone: String,
        line1: String,
        line2: String,
        city: String,
        state: String,
        pincode: String
      }
    ],
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (this.password === "") {
    this.password = undefined;
  }
  if (!this.isModified("password")) return next();
  if (!this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function matchPassword(enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
