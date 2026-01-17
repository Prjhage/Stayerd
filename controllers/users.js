const User = require("../models/user.js");
const Booking = require("../models/booking");
const Listing = require("../models/listing");
const bcrypt = require("bcrypt");

module.exports.renderSignupform = (req, res) => {
  res.render("users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
  try {
    let { username, email, password, phone } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.username === username) {
        req.flash("error", "Username already exists. Please choose another.");
      } else {
        req.flash("error", "Email is already registered. Please login.");
      }
      return res.redirect("/signup");
    }

    if (!phone) {
      throw new Error("Phone number is required");
    }

    // 🔐 Hash mobile number
    const phoneHash = await bcrypt.hash(phone, 10);
    const phoneLast4 = phone.slice(-4);

    const newUser = new User({
      email,
      username,
      phoneHash,
      phoneLast4,
    });

    const registeredUser = await User.register(newUser, password);

    req.login(registeredUser, (err) => {
      if (err) {
        return next(err);
      }
      req.flash("success", "Welcome to Wanderlust!");
      res.redirect("/listings");
    });
  } catch (e) {
    console.log("Signup Error:", e);
    req.flash("error", e.message);
    res.redirect("/signup");
  }
};

module.exports.renderLoginform = (req, res) => {
  res.render("users/login.ejs");
};

module.exports.login = (req, res) => {
  req.flash("success", "Welcome to Wanderlust! You are logged in!");
  let redirectUrl = res.locals.redirectUrl || "/listings";
  res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "you are logged out!");
    res.redirect("/listings");
  });
};

module.exports.toggleWishlist = async (req, res) => {
  const listingId = req.params.id;
  const user = await User.findById(req.user._id);

  if (user.wishlist.indexOf(listingId) !== -1) {
    user.wishlist.pull(listingId); // remove
  } else {
    user.wishlist.push(listingId); // save
  }
  await user.save();
  res.json({ success: true });
};

module.exports.getWishlist = async (req, res) => {
  const user = await User.findById(req.user._id).populate("wishlist");
  res.render("users/wishlist.ejs", {
    listings: user.wishlist,
  });
};

module.exports.profile = async (req, res) => {
  const wishlistListings = await Listing.find({
    _id: { $in: req.user.wishlist || [] },
  });

  const bookings = await Booking.find({ user: req.user._id }).populate(
    "listing"
  );
  const myListings = await Listing.find({ Owner: req.user._id });

  res.render("users/profile.ejs", {
    user: req.user,
    wishlistListings,
    bookings,
    myListings,
  });
};

module.exports.updateProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (req.file) {
      // If there's an uploaded file, update the avatar
      user.avatar = {
        url: req.file.path,
        filename: req.file.filename,
      };
      await user.save();

      // Update the session user data
      req.user.avatar = user.avatar;

      req.flash("success", "Profile photo updated successfully!");
    } else {
      req.flash("error", "No file uploaded. Please select an image.");
    }

    res.redirect("/profile");
  } catch (error) {
    console.error("Profile photo update error:", error);
    req.flash("error", "Failed to update profile photo. Please try again.");
    res.redirect("/profile");
  }
};

module.exports.hostDashboard = async (req, res) => {
  // Fetch bookings for listings owned by the current user (host)
  const hostBookings = await Booking.find()
    .populate({
      path: "listing",
      match: { Owner: req.user._id }, // Only listings owned by the current user
    })
    .populate("user") // The guest who made the booking
    .populate("partner"); // The booking partner

  // Filter out bookings where listing is null (not owned by the user)
  const filteredBookings = hostBookings.filter(
    (booking) => booking.listing !== null
  );

  // Categorize bookings by status
  const upcoming = filteredBookings.filter((b) => b.status === "upcoming");
  const confirmed = filteredBookings.filter((b) => b.status === "confirmed");
  const completed = filteredBookings.filter((b) => b.status === "completed");
  const cancelled = filteredBookings.filter((b) => b.status === "cancelled");

  res.render("users/hostDashboard.ejs", {
    upcoming,
    confirmed,
    completed,
    cancelled,
  });
};
