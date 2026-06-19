import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import UserModel from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const userSignup = async (req, res) => {
  const { fullname, email, password } = req.body;
  const v_name = fullname?.trim();
  const v_mail = email?.trim().toLowerCase();
  try {
    if (!v_name || !v_mail || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(v_mail)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    const user = await UserModel.findOne({ email: v_mail });
    if (user) {
      return res.status(400).json({
        message: "Email already exists!",
      });
    }

    //hash password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const newUser = new UserModel({
      fullname: v_name,
      email: v_mail,
      password: hashPassword,
    });
    if (newUser) {
      const savedUser = await newUser.save();
      generateToken(savedUser._id, res);

      res.status(201).json({
        _id: savedUser._id,
        fullname: savedUser.fullname,
        email: savedUser.email,
        profile_pic: savedUser.profile_pic,
      });

      try {
        await sendWelcomeEmail(
          savedUser.email,
          savedUser.fullname,
          process.env.CLIENT_URL
        );
      } catch (error) {
        console.error("Failed to send welcome email!");
      }
    } else {
      res.status(400).json({
        message: "Invalid user data",
      });
    }
  } catch (error) {
    console.error("Error in signup controller", error);
    res.status(500).json({
      message: "Internal Server Error",
      error,
    });
  }
};

export const userLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);
    res.status(200).json({
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      profile_pic: user.profile_pic,
    });
  } catch (error) {
    console.error("Error in login", error);
    res.status(500).json({
      message: "Internal Server Error",
      error,
    });
  }
};

export const userLogout = (_, res) => {
  res.cookie("jwt", "", {
    maxAge: 0,
  });
  res.status(200).json({ message: "Logged out successfully" });
};

export const userProfile = async (req, res) => {
  console.log(req.body);
  const { profile_pic } = req.body;
  try {
    if (!profile_pic) {
      return res.status(400).json({ message: "Profile picture is required" });
    }
    const userID = req.user._id;
    const uploadResponse = await cloudinary.uploader.upload(profile_pic);

    const updatedUser = await UserModel.findByIdAndUpdate(
      userID,
      {
        profile_pic: uploadResponse.secure_url,
      },
      { new: true }
    );

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error in update profile", error);
    res.status(500).json({
      message: "Internal Server Error",
      error,
    });
  }
};
