const mongoose = require("mongoose");

const passportLocalMongoose = require("passport-local-mongoose");

const findOrCreate = require("mongoose-findorcreate");

const userSchema = mongoose.Schema({
  id: {
    type: String,
    reuire: true,
  },
  email: {
    type: String,
    reuire: true,
  },
  password: {
    type: String,
    reuired: [true, "please add a password"],
    minlength: 6,
    select: false,
  },
  googleId: { type: String },
  email: { type: String, reuire: true },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
module.exports = mongoose.model("User", userSchema);
