const mongoose = require("mongoose");

// Define the schema for the Order model
const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },

  address: {
    type: String,
    required: true,
  },

  items: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    default: "pending",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create the Order model using the schema
const Order = mongoose.model("Order", orderSchema);

// Export the model to be used in other parts of the application
module.exports = Order;
