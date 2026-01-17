const Listing = require("../models/listing.js");
const ExpressError = require("../utils/expresserror.js");
const Booking = require("../models/booking");
const { getTravelSuggestions } = require("../services/geminiService");
const { getImage } = require("../services/imageService");
const { getNearbyPlaces } = require("../services/nearbyPlacesService");
const amenityIcons = require("../public/js/amenities.js");

module.exports.index = async (req, res) => {
  const { q, category } = req.query;
  const query = {};

  if (category) {
    query.category = { $regex: new RegExp(`^${category}$`, "i") };
  }

  if (q) {
    query.$or = [
      { title: { $regex: q, $options: "i" } },
      { location: { $regex: q, $options: "i" } },
      { country: { $regex: q, $options: "i" } },
    ];
  }

  const allListings = await Listing.find(query);

  const userWishlist = req.user ? req.user.wishlist || [] : [];

  // Check if user has any listings (is a host)
  const isHost = req.user
    ? (await Listing.find({ Owner: req.user._id })).length > 0
    : false;

  res.render("listings/index.ejs", {
    allListings,
    userWishlist,
    isHost,
  });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListings = async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("Owner");

  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  let nearbyPlaces = [];

  if (listing.geometry && listing.geometry.coordinates) {
    const lng = listing.geometry.coordinates[0];
    const lat = listing.geometry.coordinates[1];

    nearbyPlaces = await getNearbyPlaces(lat, lng);
  }

  // Limit to 5 items
  if (nearbyPlaces.length > 5) {
    nearbyPlaces = nearbyPlaces.slice(0, 5);
  }

  // 🔹 Fetch images for Nearby Places (Overpass)
  if (nearbyPlaces.length > 0) {
    nearbyPlaces = await Promise.all(
      nearbyPlaces.map(async (place) => {
        const img = await getImage(`${place.name} ${listing.location}`);
        return {
          ...place,
          image:
            img ||
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop",
        };
      })
    );
  }

  console.log("Nearby places sent to UI:", nearbyPlaces.length);

  // 🔹 2. Latest travelCompanion data (food + places)
  const travelCompanion = listing.travelCompanion || { places: [], food: [] };

  console.log("Nearby places:", nearbyPlaces.length);
  console.log(
    "TravelCompanion:",
    travelCompanion ? "Available" : "Not available"
  );

  res.render("listings/show.ejs", {
    listing,
    avgRating: listing.avgRating,
    nearbyPlaces,
    travelCompanion,
    amenityIcons,
  });
};

module.exports.createListings = async (req, res) => {
  // ✅ VALIDATE LISTING DATA
  if (!req.body.listing) {
    req.flash("error", "Invalid listing data");
    return res.redirect("/listings/new");
  }

  // ✅ MAIN IMAGE (REQUIRED)
  let mainImage;
  // ✅ HOST TERMS VALIDATION
  if (!req.body.listing.acceptHostTerms) {
    req.flash("error", "Please accept host terms and conditions");
    return res.redirect("/listings/new");
  }

  if (
    req.files &&
    req.files["listing[image]"] &&
    req.files["listing[image]"].length > 0
  ) {
    mainImage = req.files["listing[image]"][0];
  } else {
    req.flash("error", "Main image is required");
    return res.redirect("/listings/new");
  }

  // ✅ OPTIONAL GALLERY IMAGES
  const galleryImages = req.files["listing[images]"] || [];

  const newListing = new Listing(req.body.listing);

  /* ---------------- GEO LOCATION ---------------- */
  try {
    if (!req.body.listing.location) {
      throw new Error("Location is missing");
    }

    if (!process.env.MAP_TOKEN) {
      console.error("MAP_TOKEN is missing in .env file");
      throw new Error("Map configuration missing");
    }

    const geoResponse = await fetch(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(
        req.body.listing.location
      )}.json?key=${process.env.MAP_TOKEN}`
    );

    const geoData = await geoResponse.json();

    if (!geoData.features || geoData.features.length === 0) {
      req.flash("error", "Invalid location. Please try a different address.");
      return res.redirect("/listings/new");
    }

    newListing.geometry = {
      type: "Point",
      coordinates: geoData.features[0].center,
    };
  } catch (err) {
    console.error("Geocoding Error:", err);
    // Fallback or redirect
    req.flash(
      "error",
      "Could not validate location. Please check the address."
    );
    return res.redirect("/listings/new");
  }

  /* ---------------- OWNER ---------------- */
  newListing.Owner = req.user._id;

  /* ---------------- IMAGES ---------------- */
  // Main card image
  newListing.image = {
    url: mainImage.path,
    filename: mainImage.filename,
  };

  // Gallery images
  newListing.images = galleryImages.map((file) => ({
    url: file.path,
    filename: file.filename,
  }));

  /* ---------------- GUEST AND PET SETTINGS ---------------- */
  newListing.maxGuests = req.body.listing.maxGuests || 5;
  newListing.maxAdults = req.body.listing.maxAdults || 5;
  newListing.maxChildren = req.body.listing.maxChildren || 5;
  newListing.petsAllowed = req.body.listing.petsAllowed === "true";
  newListing.petChargePerNight = req.body.listing.petChargePerNight || 300;
  newListing.extraGuestChargePerNight =
    req.body.listing.extraGuestChargePerNight || 500;
  newListing.freeGuests = req.body.listing.freeGuests || 3;

  /* ---------------- AMENITIES ---------------- */
  // Ensure amenities always stored as array
  if (!newListing.amenities) {
    newListing.amenities = [];
  }

  /* ---------------- AI TRAVEL COMPANION ---------------- */
  let travelCompanion = { places: [], food: [] };

  try {
    if (newListing.location) {
      const aiData = await getTravelSuggestions(newListing.location, 3);

      const placeImages = [];
      if (aiData.places) {
        for (let place of aiData.places) {
          const img = await getImage(`${place} ${newListing.location}`);
          placeImages.push({
            name: place,
            image:
              img ||
              "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop",
          });
        }
      }

      const foodImages = [];
      if (aiData.food) {
        for (let food of aiData.food) {
          const img = await getImage(`${food} food`);
          foodImages.push({
            name: food,
            image:
              img ||
              "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop",
          });
        }
      }

      travelCompanion = { places: placeImages, food: foodImages };
    }
  } catch (err) {
    console.log("AI Generation Error:", err);
  }

  newListing.travelCompanion = travelCompanion;

  /* ---------------- SAVE ---------------- */
  try {
    await newListing.save();

    // 👑 Upgrade user to host if they create a listing
    if (req.user.role !== "host") {
      req.user.role = "host";
      await req.user.save();
    }

    req.flash("success", "Successfully created a new listing");
    res.redirect(`/listings/${newListing._id}`);
  } catch (saveError) {
    console.error("Error saving listing:", saveError);
    req.flash("error", `Failed to create listing: ${saveError.message}`);
    return res.redirect("/listings/new");
  }
};

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  let orignalImageUrl = listing.image.url.replace("/upload", "/upload/w_250");

  res.render("listings/edit.ejs", { listing, orignalImageUrl });
};

module.exports.updateListings = async (req, res) => {
  if (!req.body.listing) {
    throw new ExpressError("Send valid data for listing", 400);
  }

  const { id } = req.params;

  // 🔹 Find listing
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }

  /* ================= GEO LOCATION UPDATE ================= */
  if (req.body.listing.location) {
    const geoResponse = await fetch(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(
        req.body.listing.location
      )}.json?key=${process.env.MAP_TOKEN}`
    );

    const geoData = await geoResponse.json();

    if (geoData.features && geoData.features.length > 0) {
      listing.geometry = {
        type: "Point",
        coordinates: geoData.features[0].center,
      };
    }
  }

  /* ================= BASIC FIELDS UPDATE ================= */
  listing.title = req.body.listing.title;
  listing.description = req.body.listing.description;
  listing.price = req.body.listing.price;
  listing.category = req.body.listing.category;
  listing.country = req.body.listing.country;
  listing.location = req.body.listing.location;

  /* ================= GUEST AND PET SETTINGS UPDATE ================= */
  listing.maxGuests = req.body.listing.maxGuests || 5;
  listing.maxAdults = req.body.listing.maxAdults || 5;
  listing.maxChildren = req.body.listing.maxChildren || 5;
  listing.petsAllowed = req.body.listing.petsAllowed === "true";
  listing.petChargePerNight = req.body.listing.petChargePerNight || 300;
  listing.extraGuestChargePerNight =
    req.body.listing.extraGuestChargePerNight || 500;
  listing.freeGuests = req.body.listing.freeGuests || 3;

  /* ================= AMENITIES UPDATE ================= */
  // If no amenities selected → empty array
  listing.amenities = req.body.listing.amenities || [];

  /* ================= MAIN IMAGE UPDATE ================= */
  if (req.files && req.files["listing[image]"]) {
    const mainImage = req.files["listing[image]"][0];
    listing.image = {
      url: mainImage.path,
      filename: mainImage.filename,
    };
  }

  /* ================= ADDITIONAL IMAGES UPDATE ================= */
  if (req.files && req.files["listing[images]"]) {
    const extraImages = req.files["listing[images]"].map((file) => ({
      url: file.path,
      filename: file.filename,
    }));

    // Append new images (do not remove old ones)
    listing.images.push(...extraImages);
  }

  /* ================= SAVE ================= */
  await listing.save();

  req.flash("success", "Listing updated successfully");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListings = async (req, res) => {
  const { id } = req.params;

  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing deleted");
  res.redirect("/listings");
};

// 🔹 Add missing controller methods to prevent crashes
module.exports.getListingsData = async (req, res) => {
  const allListings = await Listing.find({});
  res.json(allListings);
};

module.exports.filterData = async (req, res) => {
  const { category } = req.query;
  if (category) {
    const listings = await Listing.find({ category });
    res.json(listings);
  } else {
    res.json([]);
  }
};
