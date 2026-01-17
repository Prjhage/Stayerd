const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 📅 Dates
    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    nights: {
      type: Number,
      required: true,
      min: 1,
    },

    // 👥 Guests (NEW – includes animals)
    guests: {
      adults: {
        type: Number,
        default: 1,
        min: 1,
      },
      children: {
        type: Number,
        default: 0,
        min: 0,
      },
      infants: {
        type: Number,
        default: 0,
        min: 0,
      },
      animals: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // 💰 Pricing
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    gst: {
      type: Number,
      required: true,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // 🤖 AI / Travel Companion
    travelCompanion: {
      weather: {
        temp: { type: String, default: null },
        condition: { type: String, default: "" },
        humidity: { type: String, default: null },
      },
      budget: {
        food: String,
        transport: String,
        attractions: String,
        dailyTotal: String,
      },
      plan: {
        type: [String],
        default: [],
      },
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

/// ✅ Date validation
bookingSchema.pre("validate", function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error("End date must be after start date"));
  } else {
    next();
  }
});

module.exports = mongoose.model("Booking", bookingSchema);
