const mongoose = require("mongoose");

const cartSchema = mongoose.Schema({
  items: {
    type: Array,
    default: [],
  },
  totalQuantity: {
    type: Number,
    default: 0,
  },
  totalPrice: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Cart", cartSchema);
