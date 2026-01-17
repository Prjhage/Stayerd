const express = require("express");
// const { model } = require("mongoose");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl, isLoggedIn } = require("../middleware.js");
const userController = require("../controllers/users.js");

//router .routes for signup
router
  .route("/signup")
  .get(userController.renderSignupform) // signup form
  .post(wrapAsync(userController.signup)); // signup logic

//router. routes for login
router
  .route("/login")
  .get((req, res) => {
    res.render("users/login.ejs");
  }) // login form
  .post(
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: "Invalid username or password",
    }),
    userController.login
  ); // login logic

//logout
router.get("/logout", userController.logout);

//wishlist
router.post(
  "/wishlist/:id",
  isLoggedIn,
  wrapAsync(userController.toggleWishlist)
);

router.get("/wishlist", isLoggedIn, wrapAsync(userController.getWishlist));

//profile
router.get("/profile", isLoggedIn, wrapAsync(userController.profile));

//profile photo upload
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

router.post(
  "/profile/photo",
  isLoggedIn,
  upload.single("avatar"),
  wrapAsync(userController.updateProfilePhoto)
);

const Listing = require("../models/listing");
const Booking = require("../models/booking");

/* ================= HOST DASHBOARD ================= */

router.get(
  "/profile/host",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    // 🔐 Only hosts allowed
    if (req.user.role !== "host") {
      req.flash("error", "Host access only");
      return res.redirect("/profile");
    }

    // 🏠 Get host listings
    const listings = await Listing.find({ Owner: req.user._id });
    const listingIds = listings.map((l) => l._id);

    // 📦 Get all bookings for those listings
    const bookings = await Booking.find({
      listing: { $in: listingIds },
    })
      .populate("user", "username email phoneLast4")
      .populate("listing", "title");

    // 📊 Categorize bookings
    const upcoming = bookings.filter((b) => b.status === "pending");
    const confirmed = bookings.filter((b) => b.status === "confirmed");
    const cancelled = bookings.filter((b) => b.status === "cancelled");
    const completed = bookings.filter((b) => b.status === "completed");

    res.render("users/hostDashboard", {
      upcoming,
      confirmed,
      cancelled,
      completed,
    });
  })
);

/* ================= UPDATE BOOKING STATUS ================= */

router.post(
  "/profile/host/bookings/:id/status",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    // 🔐 Only hosts allowed
    if (req.user.role !== "host") {
      req.flash("error", "Host access only");
      return res.redirect("/profile");
    }

    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      req.flash("error", "Invalid status");
      return res.redirect("/profile/host");
    }

    // Find booking and verify ownership
    const booking = await Booking.findById(id).populate("listing");
    if (!booking) {
      req.flash("error", "Booking not found");
      return res.redirect("/profile/host");
    }

    // Check if user owns the listing
    if (!booking.listing.Owner.equals(req.user._id)) {
      req.flash("error", "Unauthorized action");
      return res.redirect("/profile/host");
    }

    // Update status
    booking.status = status;
    await booking.save();

    req.flash("success", `Booking status updated to ${status}`);
    res.redirect("/profile/host");
  })
);

module.exports = router;
