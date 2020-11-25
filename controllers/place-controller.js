const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const User = require("../models/user");
const Place = require("../models/place");
const cloudinary = require("../middleware/cloudinaryConfig.js");
const HttpError = require("../models/http-error");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;

  try {
    place = await Place.findById(placeId);
  } catch {
    return next(new HttpError("Could not find place by id.", 500));
  }

  if (!place) {
    return next(new HttpError(`Cannot find place with ${userId} id`, 404));
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let userWithPlaces;

  try {
    userWithPlaces = await User.findById(userId).populate("places");
  } catch {
    return next(new HttpError("Could not find place by user id.", 500));
  }

  // if (!userWithPlaces.places || userWithPlaces.places.length === 0) {
  // return next(new HttpError("Cannot find place with place id", 404));
  // }

  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new Error("Try with valid data", 422);
  }

  const { title, description, address, creator } = req.body;

  let cloudImage;
  try {
    cloudImage = await cloudinary.uploader.upload(req.file.path);
  } catch (err) {
    return next(new HttpError("Uploading image to cloud failed.", 404));
  }

  const createdPlace = new Place({
    title,
    description,
    image: cloudImage.secure_url,
    location: {
      lat: 77.2,
      lng: 80,
    },
    address,
    creator,
  });

  let user;
  try {
    user = await User.findById(creator);
  } catch {
    return next(new HttpError("Failed loading.", 404));
  }

  if (!user) {
    return next(new HttpError("User is not registered.", 404));
  }

  try {
    const sess = await mongoose.startSession();

    sess.startTransaction();
    // console.log("hello");
    // let newPlace = { name: "hello" };
    await createdPlace.save({ session: sess });
    // await newPlace.save({ session: sess });
    // console.log("hello");
    user.places.push(createdPlace);

    await user.save({ session: sess });

    await sess.commitTransaction();
  } catch {
    return next(new HttpError("Failed to create Place.", 404));
  }
  console.log("Error found");

  res.status(201).json({ place: createdPlace });
};

const updatePlaceById = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    throw new Error("Try with valid data", 422);
  }

  const { title, description } = req.body;

  const placeId = req.params.pid;

  let place;

  try {
    place = await Place.findById(placeId);
  } catch {
    return next(new HttpError("Failed to find Place.", 500));
  }

  if (place.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to edit this.", 401));
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch {
    return next(new HttpError("Failed to update Place.", 500));
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;

  try {
    place = await Place.findById(placeId).populate("creator");
  } catch {
    return next(new HttpError("Failed to find Place.", 500));
  }

  if (!place) {
    return next(new HttpError("Failed to find Place.", 404));
  }

  if (place.creator.id !== req.userData.userId) {
    return next(new HttpError("You are not allowed to delete this.", 401));
  }

  try {
    const sess = await mongoose.startSession();

    sess.startTransaction();

    await place.remove({ session: sess });
    place.creator.places.pull(place);

    await place.creator.save({ session: sess });

    await sess.commitTransaction();
  } catch {
    return next(new HttpError("Failed to delete Place.", 500));
  }

  res.status(200).json({ message: "Deleted" });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlaceById = updatePlaceById;
exports.deletePlace = deletePlace;
