const mongoose = require("mongoose");

const cartSchema = mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
  },
  item: {
    type: String,
    required: true,
  },
  totalQuantity: {
    type: Number,
    default: 1,
  },
  totalPrice: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Cart", cartSchema);
