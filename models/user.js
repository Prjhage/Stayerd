const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const bcrypt = require("bcrypt");

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },

    // 🔐 Firebase Auth UID
    firebaseUID: {
      type: String,
      unique: true,
      sparse: true,
    },

    // 🧑 Username / display name
    username: {
      type: String,
      required: true,
    },

    // 📱 Mobile (hashed for security)
    phoneHash: {
      type: String,
    },

    // 🔢 Last 4 digits (safe to display)
    phoneLast4: {
      type: String,
    },

    // 🎭 Role based access
    role: {
      type: String,
      enum: ["user", "host", "partner"],
      default: "user",
    },

    // ❤️ Wishlist
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Listing",
      },
    ],

    // 🖼️ Profile avatar (optional)
    avatar: {
      url: {
        type: String,
        default: "/images/default-user.png",
      },
      filename: String,
    },

    // 🏷️ Status (future use)
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.statics.hashPhone = async function (phone) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(phone, salt);
};

userSchema.plugin(passportLocalMongoose); //username,passport ,salting and hashing do automaticaly
module.exports = mongoose.model("User", userSchema);
