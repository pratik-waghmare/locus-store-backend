const express = require("express");
const { check } = require("express-validator");

const userController = require("../controllers/user-controller");
const fileUpload = require("../middleware/file-upload");

const router = express.Router();

router.get("/", userController.getUsers);

router.get("/:uid", userController.getUserById);

router.post("/login", userController.login);

router.post(
  "/signup",
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  userController.signup
);

router.post(
  "/upload/:uid",
  fileUpload.single("image"),
  userController.updateImage
);

router.patch("/update/:uid", userController.updateUserById);

module.exports = router;
