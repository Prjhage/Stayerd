const admin = require("../config/firebaseAdmin");

module.exports.verifyFirebaseToken = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization) {
      token = req.headers.authorization.split("Bearer ")[1];
    } else {
      token = null;
    }

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);

    req.firebaseUser = decodedToken; // uid, email
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};
