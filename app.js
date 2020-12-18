const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const cors = require("cors");

const HttpError = require("./models/http-error");
const placesRoutes = require("./routes/places-routes");
const userRoutes = require("./routes/user-routes");

const app = express();
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use("/api/places", placesRoutes);

app.use("/api/users", userRoutes);

app.use((req, res, next) => {
  const error = new HttpError("Could not find route", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => console.log(err));
  }
  if (res.headerSent) {
    return next(error);
  }

  res
    .status(error.code || 500)
    .json({ message: error.message || "An unknown error occured." });
});

const port = process.env.PORT || 5000;

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.t88jq.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() =>
    app.listen(port, () => console.log("Server running at port " + port))
  )
  .catch((err) => console.log("Failed to connect to server."));
