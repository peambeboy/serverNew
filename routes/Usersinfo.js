const express = require("express");
const router = express.Router();
const Usersinfo = require("../models/Usersinfo");
const Token = require("../models/Token");
const {
  verifyToken,
  generateNewToken,
  generateToken,
  hashPassword,
} = require("../utilities/token");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Use environment variable for secret key
const secretKey = process.env.JWT_SECRET;

// Get all users
router.get("/", verifyToken, async (req, res) => {
  try {
    const tokenAdmin = req.headers["authorization"];
    const decoded = jwt.verify(tokenAdmin, secretKey);

    const findAdmin = await Token.findOne({ user: decoded.user });

    const listOfUsers = await Usersinfo.find();

    // สร้าง token ใหม่และอัปเดตในฐานข้อมูล
    const newToken = await generateNewToken(decoded.user, findAdmin);

    res.json({listOfUsers,newToken});
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user by email
router.get("/address", async (req, res) => {
  const email = req.query.email;

  try {
    const userInfos = await Usersinfo.find({ email: email });

    if (!userInfos) {
      return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
    } else if (userInfos.length === 0) {
      return res.json([]);
    }

    res.json(userInfos);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await Usersinfo.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new user
router.post("/", async (req, res) => {
  const data = req.body;

  try {
    const newUser = new Usersinfo(data);
    await newUser.save();
    res.json(newUser);
  } catch (error) {
    console.error("Error creating/updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a user
router.put("/:id", async (req, res) => {
  try {
    const updatedUser = await Usersinfo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a user
router.delete("/:id", async (req, res) => {
  try {
    const deletedUser = await Usersinfo.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
