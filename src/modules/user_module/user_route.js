const express = require("express");
const {
  LoginUser,
  registerNewUser,
  changePassword,
  editMyProfile,
  passLink,
  resetPassword,
} = require("./user_controller");
const authmiddleware = require("../../middlewares/auth");
const router = express.Router();

router.post("/login", LoginUser);
router.post("/register", registerNewUser);
router.post("/reset-password-link", passLink);
router.post("/reset-password", resetPassword);
router.patch("/update-profile", authmiddleware, editMyProfile);

module.exports = router;
