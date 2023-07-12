const mongoose = require("mongoose");

const orderSchema = mongoose.Schema({
  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cart",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "pending",
  },
  date: {
    type: Date,
    default: Date.now,
    get: function() {
      return this.getDateFormatted();
    },
  },
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
});

orderSchema.methods.getDateFormatted = function() {
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  };

  return this.date.toLocaleDateString("en-US", options);
};

module.exports = mongoose.model("Order", orderSchema);
