import mongoose, { Document, Schema } from "mongoose";

export interface ICourt extends Document {
  courtName: string;
  type: "baloncesto" | "voleibol";
  location: string;
  indoorOrOutdoor: "techado" | "destechado";
  playerCapacity: number;
  hourStartTime: string; // formato HH:mm
  hourEndTime: string;
  status: "activo" | "mantenimiento";
  hasLight: boolean;
  description?: string;
  operatingDays: string[]; // ej: ["lunes", "martes"]
  isDeleted: boolean;
}

const CourtSchema = new Schema<ICourt>(
  {
    courtName: { type: String, required: true },
    type: { type: String, enum: ["baloncesto", "voleibol"], required: true },
    location: { type: String, required: true },
    indoorOrOutdoor: { type: String, enum: ["techado", "destechado"], required: true },
    playerCapacity: { type: Number, required: true },
    hourStartTime: { type: String, required: true },
    hourEndTime: { type: String, required: true },
    status: { type: String, enum: ["activo", "mantenimiento"], default: "activo" },
    hasLight: { type: Boolean, default: false },
    description: { type: String },
    operatingDays: [{ type: String, required: true }],
    isDeleted: {type: Boolean, default: false},
  },
  { timestamps: true }
);

export default mongoose.model<ICourt>("Court", CourtSchema);
