const { validationResult } = require("express-validator");

const User = require("../models/user");
const HttpError = require("../models/http-error");
const cloudinary = require("../middleware/cloudinaryConfig.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const getUsers = async (req, res, next) => {
  let users;

  try {
    users = await User.find({}, "-password");
  } catch {
    return next("User loading failed.", 404);
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let identifiedUser;

  try {
    identifiedUser = await User.findOne({ email: email });
  } catch {
    return next(new HttpError("User not found.", 404));
  }

  if (!identifiedUser) {
    return next(new HttpError("Could not find user", 404));
  }

  let isValidPassword;
  try {
    isValidPassword = await bcrypt.compare(password, identifiedUser.password);
  } catch {
    return next(new HttpError("Logging in failed.", 404));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: identifiedUser.id, email: identifiedUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch {
    return next(new HttpError("Logging in failed.", 403));
  }

  res.status(200).json({
    userId: identifiedUser.id,
    email: identifiedUser.email,
    token: token,
  });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  console.log(errors);
  if (!errors.isEmpty()) {
    return next(new Error("Try with valid data", 422));
  }

  const { name, email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch {
    return next(new HttpError("Finding user failed.", 404));
  }

  if (existingUser) {
    return next(new HttpError("Email exists.", 404));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(new HttpError("Encryption Failed.", 404));
  }

  let cloudImage;
  try {
    cloudImage = await cloudinary.uploader.upload(req.file.path);
  } catch (err) {
    return next(new HttpError("Uploading image to cloud failed.", 404));
  }

  const newUser = new User({
    name,
    email,
    image: cloudImage.secure_url,
    password: hashedPassword,
    places: [],
  });

  try {
    await newUser.save();
  } catch {
    return next(new HttpError("Registration failed.", 404));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch {
    return next(new HttpError("Registration failed.", 403));
  }

  res.json({ userId: newUser.id, email: newUser.email, token: token });
};

exports.getUsers = getUsers;
exports.login = login;
exports.signup = signup;
