require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");

const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const bookingRoutes = require("./routes/bookings");
const authRouter = require("./routes/auth.js");

const session = require("express-session");
const { default: MongoStore } = require("connect-mongo");
const flash = require("connect-flash");

const passport = require("passport");
const localStrategy = require("passport-local");
const User = require("./models/user.js");

const dburl = process.env.ATLASDB_URL;

const store = MongoStore.create({
    mongoUrl: dburl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 60 * 60,
});

const sessionOptions = {
    store: store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // one week for milliseconds
        maxAge: 7 * 24 * 60 * 60 * 1000,
    },
};

app.use(session(sessionOptions));
app.use(flash());
//passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser()); //serialize user into the session
passport.deserializeUser(User.deserializeUser()); //deserialize user into the session

//middleware for flash
// In your app.js, find the middleware where you set res.locals (usually before your routes)
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    res.locals.currentPath = req.path;

    // Add this function definition:
    res.locals.renderStars = (rating) => {
        if (!rating) rating = 0;
        let stars = "";
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                // Full Star
                stars += "★";
            } else if (i === Math.ceil(rating) && !Number.isInteger(rating)) {
                // Half Star
                stars += "☆";
            } else {
                // Empty Star
                stars += "☆";
            }
        }
        return stars;
    };

    next();
});

// Database connection
main()
    .then(() => {
        console.log("Connected to DB");
    })
    .catch((err) => console.log(err));

// async function main() {
//     await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");
// }

async function main() {
    await mongoose.connect(dburl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // For parsing application/json
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);

//Home Route
app.get("/", async(req, res) => {
    try {
        const Listing = require("./models/listing.js");
        // Fetch top 6 featured listings (highest rated or recently added)
        const featuredListings = await Listing.find()
            .limit(6)
            .populate("reviews")
            .exec();

        // Calculate average rating for each listing
        const listingsWithRating = featuredListings.map((listing) => {
            const avgRating =
                listing.reviews && listing.reviews.length > 0 ?
                listing.reviews.reduce((sum, review) => sum + review.rating, 0) /
                listing.reviews.length :
                0;
            return {
                ...listing.toObject(),
                avgRating: avgRating,
            };
        });

        res.render("home.ejs", { featuredListings: listingsWithRating });
    } catch (error) {
        console.log("Error fetching featured listings:", error);
        res.render("home.ejs", { featuredListings: [] });
    }
});

//Routers
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/", bookingRoutes);
app.use("/", authRouter);

app.use((err, req, res, next) => {
    let { message = "something went wrong", statuscode = 500 } = err;
    res.status(statuscode).render("error.ejs", { err });
});
app.listen(8080, () => {
    console.log("Server is running on port 8080");
});