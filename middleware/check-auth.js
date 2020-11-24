const HttpError = require("../models/http-error");
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return next(new HttpError("Authorisation Failed", 403));
    }

    const decodeToken = jwt.verify(token, process.env.JWT_KEY);
    req.userData = { userId: decodeToken.userId };
    next();
  } catch (err) {
    return next(new HttpError("Authorisation Failed", 403));
  }
};
