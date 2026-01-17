const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { verifyFirebaseToken } = require("../middleware/firebaseAuth");

router.post("/firebase-login", verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, email } = req.firebaseUser;

    // 1. Check if user exists by Firebase UID
    let user = await User.findOne({ firebaseUID: uid });

    // 2. If not found, check by email (to link existing accounts)
    if (!user) {
      user = await User.findOne({ email: email });
      if (user) {
        user.firebaseUID = uid;
        await user.save();
      }
    }

    // 3. If still no user, create a new one
    if (!user) {
      let username = email.split("@")[0];
      // Check for username collision
      const checkUser = await User.findOne({ username });
      if (checkUser) {
        username += Math.floor(Math.random() * 10000);
      }

      user = new User({ username, email, firebaseUID: uid });
      await user.save();
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: "Login failed" });
      }
      res.json({ success: true });
    });
  } catch (err) {
    console.error("Firebase Login Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
