const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./reviews");

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  image: {
    url: String,
    filename: String,
  },
  images: [
    {
      url: String,
      filename: String,
    },
  ],
  amenities: {
    type: [String],
    default: [],
  },
  price: Number,
  location: String,
  country: String,
  category: {
    type: String,
    enum: [
      "trending",
      "rooms",
      "iconic",
      "mountain",
      "castles",
      "pools",
      "camping",
      "farms",
      "arctic",
      "domes",
      "boats",
      "forest",
      "lakefront",
      "beach",
      "urban",
      "countryside",
    ],
    index: true,
  },
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  avgRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },

  ratingCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  Owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  // Guest and Pet Settings (Host-controlled)
  maxGuests: {
    type: Number,
    default: 5,
    min: 1,
    max: 20,
  },
  maxAdults: {
    type: Number,
    default: 5,
    min: 1,
    max: 20,
  },
  maxChildren: {
    type: Number,
    default: 5,
    min: 0,
    max: 20,
  },
  petsAllowed: {
    type: Boolean,
    default: false,
  },
  petChargePerNight: {
    type: Number,
    default: 300,
    min: 0,
  },
  extraGuestChargePerNight: {
    type: Number,
    default: 500,
    min: 0,
  },
  freeGuests: {
    type: Number,
    default: 3,
    min: 0,
  },
  travelCompanion: {
    places: [
      {
        name: String,
        image: String,
        extraGuestChargePerNight: {
          type: Number,
          default: 500,
          min: 0,
        },
        freeGuests: {
          type: Number,
          default: 3,
          min: 0,
        },
        geometry: {
          type: {
            type: String,
            enum: ["Point"],
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
          },
        },
      },
    ],
    food: [
      {
        name: String,
        image: String,
      },
    ],
  },
});
listingSchema.post("findOneAndDelete", async function (listing) {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});
const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;
