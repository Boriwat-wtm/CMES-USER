import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ["display", "technical", "payment", "other"],
    },
    detail: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);

export default Report;
