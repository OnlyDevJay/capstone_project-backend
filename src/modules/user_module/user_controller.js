const UserSchema = require("../../shared models/User_model");
const {
  validationForRegisterSchema,
  validationForLogin,
  validationForUpdateProfile,
} = require("./user_validation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendUniversalMail } = require("../../utils/email.js");
// 1. REQUEST PASSWORD RESET (FORGOT PASSWORD VIEW)
const crypto = require("crypto"); // 🧠 CRITICAL FIX: Don't forget to import crypto!

const registerNewUser = async (req, res) => {
  const { error, value } = validationForRegisterSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  // find email is existing
  const existing_user = await UserSchema.findOne({ email: value.email });
  if (existing_user) {
    return res.status(400).json({ message: "email already exist" });
  }
  const existing_username = await UserSchema.findOne({
    username: value.username,
  });
  if (existing_username) {
    return res.status(400).json({ message: "username already taken" });
  }
  if (value.confirm_password !== value.password) {
    return res.status(400).json({ message: "passwords do not much" });
  }

  try {
    //hash password
    const salt = await bcrypt.genSalt(10);
    const hashed_password = await bcrypt.hash(value.password, salt);

    // go on to register user
    const User_info = new UserSchema({
      email: value.email,
      name: value.name,
      username: value.username,
      role: "student",
      password: hashed_password,
      phone: value.phone,
    });
    await User_info.save();
    //send back the user
    const newUser = {
      email: value.email,
      name: value.name,
      username: value.username,
      phone: value.phone,
    };
    res.status(201).json({ message: "user successfully registered", newUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message:
        "something went wrong if error persists kindly contact the administrator",
    });
  }
};

const LoginUser = async (req, res) => {
  try {
    const { error, value } = validationForLogin.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    let tryingToLoginUser;
    if (value.main.includes("@")) {
      //find the user
      tryingToLoginUser = await UserSchema.findOne({ email: value.main });
    } else {
      tryingToLoginUser = await UserSchema.findOne({
        username: value.main,
      });
    }

    if (!tryingToLoginUser) {
      res.status(404).json({ message: "user not found" });
    }
    //compare passwords and login
    const compare_passwords = await bcrypt.compare(
      value.password,
      tryingToLoginUser.password,
    );
    if (!compare_passwords) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: tryingToLoginUser._id,
        name: tryingToLoginUser.name,
        email: tryingToLoginUser.email,
        role: tryingToLoginUser.role,
        username: tryingToLoginUser.username,
        phone: tryingToLoginUser.phone,
      },
      process.env.JWT_SECRETE,
      { expiresIn: process.env.EXPIRES_IN },
    );

    const safe_user = {
      id: tryingToLoginUser._id,
      name: tryingToLoginUser.name,
      username: tryingToLoginUser.username,
      email: tryingToLoginUser.email,
      role: tryingToLoginUser.role,
      phone: tryingToLoginUser.phone,
    };

    //if password is right
    res.status(200).json({
      message: "login was successful",
      safe_user,
      token,
      vapidPublicKey: process.env.PUBLIC_KEY,
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "something went wrong while logging in" });
  }
};

const editMyProfile = async (req, res) => {
  try {
    const { error, value } = validationForUpdateProfile.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const userId = req.user.id;
    const thePerson = await UserSchema.findById(userId).select("-password");
    if (!thePerson) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedProfile = await UserSchema.findByIdAndUpdate(userId, value, {
      new: true,
      runValidators: true,
    }).select("-password");

    return res.status(200).json({
      message: "Profile updated successfully",
      updatedProfile,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const thePerson = await UserSchema.findById(userId);

    if (!thePerson) {
      return res.status(404).json({ message: "User not found" });
    }

    const { oldPassword, newPassword } = req.body;

    // Compare old password with stored hash
    const isMatch = await bcrypt.compare(oldPassword, thePerson.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await UserSchema.findByIdAndUpdate(
      userId,
      { password: hashedNewPassword },
      { new: true },
    );

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

const passLink = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ message: "Identifier is required." });
    }

    // 1. Fetch user account matching configuration parameter parameters
    const user = await UserSchema.findOne({
      $or: [
        { email: identifier.trim().toLowerCase() }, // Good practice: Lowercase email lookups
        { username: identifier.trim() },
      ],
    });

    // 2. CRITICAL SECURITY & CRASH FIX:
    // If user does not exist, return the same 200 success response instantly.
    // This stops server crashes and hides valid/invalid usernames from hackers!
    if (!user) {
      return res.status(200).json({
        message:
          "If this account exists, a reset link will be sent to the registered email.",
      });
    }

    // 3. Generate token securely
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;

    // 4. Synchronize expirations: 15 minutes validity
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    // Change 'localhost:5173' to your actual production frontend URL when deploying!
    const resetLink = `https://focuset.netlify.app/forgot-password?token=${token}`;

    // 5. Fire your universal background email sender (Do NOT await!)
    sendUniversalMail("forgetPassword", {
      recipientEmail: user.email,
      recipientName: user.username || user.name || "User",
      subject: "Password Reset - PresencePro",
      custome: resetLink, // Matches the 'custome' argument in your mailer function
    }).catch((emailErr) => {
      console.error(
        "Background password delivery failed server tracking:",
        emailErr.message,
      );
    });

    // 6. Explicitly send response back so frontend stops spinning loading icons
    return res.status(200).json({
      message:
        "If this account exists, a reset link will be sent to the registered email.",
    });
  } catch (err) {
    console.error("Critical password generation route breakdown error:", err);
    return res.status(500).json({
      message: "Something went wrong while processing reset link request.",
    });
  }
};

// Reset password endpoint
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Find user with matching token and not expired
    const user = await UserSchema.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    if (user.isDeleted === true) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user record
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerNewUser,
  LoginUser,
  editMyProfile,
  changePassword,
  passLink,
  resetPassword,
};
