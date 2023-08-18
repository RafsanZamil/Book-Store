const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");

const productSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  genre: {
    type: String,
    reiquired: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  topSelling: {
    type: Boolean,
    default: false,
  },
  newArrival: {
    type: Boolean,
    default: false,
  },

  image: {
    data: Buffer, // Store image data as a buffer
    contentType: String, // Store the content type of the image
    path: String, // Store the path to the image
  },

  createdOn: {
    type: Date,
    default: Date.now,
  },
});
productSchema.pre("save", function (next) {
  if (this.image && this.image.path) {
    this.image.path = this.image.path.replace("public", "");
  }
  next();
});

module.exports = mongoose.model("Product", productSchema);
