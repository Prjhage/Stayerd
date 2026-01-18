const Joi = require("joi");

// Schema for creating new listings (requires acceptHostTerms)
module.exports.listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    location: Joi.string().required(),
    country: Joi.string().required(),
    category: Joi.string()
      .valid(
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
      )
      .required(),
    price: Joi.number().required().min(0),
    image: Joi.string().allow("", null),
    amenities: Joi.array().items(Joi.string()).single().optional(),
    acceptHostTerms: Joi.boolean().required(),
    // Guest and Pet Settings
    maxGuests: Joi.number().min(1).max(20).optional(),
    maxAdults: Joi.number().min(1).max(20).optional(),
    maxChildren: Joi.number().min(0).max(20).optional(),
    petsAllowed: Joi.boolean().optional(),
    petChargePerNight: Joi.number().min(0).optional(),
    extraGuestChargePerNight: Joi.number().min(0).optional(),
    freeGuests: Joi.number().min(0).optional(),
  }).required(),
});

// Schema for updating existing listings (acceptHostTerms not required)
module.exports.listingUpdateSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    location: Joi.string().required(),
    country: Joi.string().required(),
    category: Joi.string()
      .valid(
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
      )
      .required(),
    price: Joi.number().required().min(0),
    image: Joi.string().allow("", null),
    amenities: Joi.array().items(Joi.string()).single().optional(),
    // acceptHostTerms not required for updates
    // Guest and Pet Settings
    maxGuests: Joi.number().min(1).max(20).optional(),
    maxAdults: Joi.number().min(1).max(20).optional(),
    maxChildren: Joi.number().min(0).max(20).optional(),
    petsAllowed: Joi.boolean().optional(),
    petChargePerNight: Joi.number().min(0).optional(),
    extraGuestChargePerNight: Joi.number().min(0).optional(),
    freeGuests: Joi.number().min(0).optional(),
  }).required(),
});
///Joi validation schema for listing(server side validation)

module.exports.reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().required().min(1).max(5),
    comment: Joi.string().required(),
  }).required(),
});
