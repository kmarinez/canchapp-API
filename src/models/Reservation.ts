import mongoose, { Document, Schema } from "mongoose";

export interface IReservation extends Document {
  court: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  date: string;
  startTime: string;
  endTime: string;
  peopleCount: number;
  reservedFor: string;
  verifyCode: string;
  status: "pendiente" | "confirmada" | "cancelada" | "usada";
  identificationNum: string;
  cancelledBy: mongoose.Schema.Types.ObjectId;
  cancelReason?: string;
}

const ReservationSchema = new Schema<IReservation>(
  {
    court: { type: Schema.Types.ObjectId, ref: "Court", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    peopleCount: { type: Number, required: true },
    reservedFor: { type: String, required: false },
    verifyCode: { type: String, required: true },
    status: { type: String, enum: ["pendiente", "confirmada", "cancelada", "usada"], default: "confirmada" },
    identificationNum: {type: String, required: true},
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    cancelReason: {type: String},
  },
  { timestamps: true }
);

export default mongoose.model<IReservation>("Reservation", ReservationSchema);
