const Listing = require("./models/listing");
const Review = require("./models/reviews");
const { listingSchema, listingUpdateSchema, reviewSchema } = require("./schema.js");
const expresserror = require("./utils/expresserror.js");

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        // redirectURL so that user is returned after login
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in to do that!");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session && req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
        delete req.session.redirectUrl;
    }
    next();
};

module.exports.isOwner = async(req, res, next) => {
    try {
        let { id } = req.params;
        let listing = await Listing.findById(id);
        if (!listing.Owner || !listing.Owner.equals(res.locals.currUser._id)) {
            req.flash("error", "You do not have permission to do that");
            return res.redirect(`/listings/${id}`);
        }
        next();
    } catch (e) {
        next(e);
    }
};

module.exports.isAuthor = async(req, res, next) => {
    try {
        let { id, reviewId } = req.params;
        let review = await Review.findById(reviewId);

        if (!review.author || !review.author.equals(res.locals.currUser._id)) {
            req.flash("error", "You did not write this review");
            return res.redirect(`/listings/${id}`);
        }
        next();
    } catch (e) {
        next(e);
    }
};

module.exports.validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new expresserror(errMsg, 400);
    } else {
        next();
    }
};

module.exports.validateListingUpdate = (req, res, next) => {
    let { error } = listingUpdateSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new expresserror(errMsg, 400);
    } else {
        next();
    }
};
module.exports.validateReview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new expresserror(errMsg, 400);
    } else {
        next();
    }
};