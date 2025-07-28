import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  lastName: string;
  identificationNum: string;
  email: string;
  password: string;
  role: "customer" | "staff" | "admin";
  status: "active" | "inactive" | "suspend";
  isActive: boolean;
  resetPasswordToken: string;
  resetPasswordExpires: Date;
  isVerified: Boolean;
  verificationCode: String,
  verificationExpires: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    lastName: { type: String, required: true },
    identificationNum: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "staff", "admin"], default: "customer" },
    status: { type: String, enum: ["active", "inactive", "suspend"], default: "active" },
    isActive: { type: Boolean, default: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String },
    verificationExpires: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
