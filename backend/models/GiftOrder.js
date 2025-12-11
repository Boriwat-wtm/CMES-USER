import mongoose from "mongoose";

const giftOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    tableNumber: {
      type: Number,
      required: true,
    },
    note: String,
    items: [
      {
        id: String,
        name: String,
        price: Number,
        quantity: Number,
      },
    ],
    totalPrice: Number,
    status: {
      type: String,
      enum: [
        "pending_payment",
        "paid",
        "completed",
        "cancelled",
        "awaiting_admin",
        "processing",
      ],
      default: "pending_payment",
    },
    paymentMethod: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const GiftOrder = mongoose.model("GiftOrder", giftOrderSchema);

export default GiftOrder;
