const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware");
const wrapAsync = require("../utils/wrapAsync");
const Booking = require("../models/booking");
const Listing = require("../models/listing");
const { generateBookingPDF } = require("../utils/generateBookingPDF");
const User = require("../models/user");

/* SHOW BOOKING FORM */
router.get(
    "/listings/:id/book",
    isLoggedIn,
    wrapAsync(async(req, res) => {
        const listing = await Listing.findById(req.params.id);
        res.render("bookings/new.ejs", { listing, user: req.user });
    })
);

/* CREATE BOOKING */
router.post(
    "/listings/:id/book",
    isLoggedIn,
    wrapAsync(async(req, res) => {
        const listing = await Listing.findById(req.params.id).populate("Owner");


        const { startDate, endDate } = req.body;

        const start = new Date(startDate);
        const end = new Date(endDate);

        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        const pricePerNight = listing.price;
        const subtotal = nights * pricePerNight;
        const gst = Math.round(subtotal * 0.18); // 18% GST
        const totalPrice = subtotal + gst;

        const booking = new Booking({
            listing: listing._id,
            user: req.user._id,
            startDate,
            endDate,
            nights,
            pricePerNight,
            gst,
            totalPrice,
        });

        await booking.save();
        req.flash("success", "🎉 Booking confirmed!");
        res.redirect("/profile");
    })
);

router.get(
    "/bookings/:id/pdf",
    isLoggedIn,
    wrapAsync(async(req, res) => {
        const booking = await Booking.findById(req.params.id).populate({
            path: "listing",
            populate: { path: "Owner" },
        });

        if (!booking) {
            req.flash("error", "Booking not found");
            return res.redirect("/profile");
        }

        generateBookingPDF({
            res,
            bookingId: booking._id,
            user: req.user,
            owner: booking.listing.Owner,
            listing: booking.listing,
            booking,
        });
    })
);

router.delete("/bookings/:id", isLoggedIn, async(req, res) => {
    const booking = await Booking.findById(req.params.id);

    // Security check: only owner can delete
    if (!booking.user.equals(req.user._id)) {
        req.flash("error", "Unauthorized action");
        return res.redirect("/profile");
    }

    await Booking.findByIdAndDelete(req.params.id);

    req.flash("success", "Booking cancelled successfully");
    res.redirect("/profile");
});

module.exports = router;