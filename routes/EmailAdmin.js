const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Token = require("../models/Token");
const jwt = require("jsonwebtoken");
const RevokedToken = require("../models/RevokedToken");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Use environment variable for secret key
const secretKey = process.env.JWT_SECRET || "default_secret_key";

const verifyToken = async (req, res, next) => {
  const token = req.headers["authorization"]; // รับ token จาก header
  if (!token) return res.status(403).send("ไม่มี Token ในคำขอ");

  try {
    // ตรวจสอบว่า token ถูกยกเลิกหรือไม่ในฐานข้อมูล
    const isRevoked = await RevokedToken.findOne({ token: token });
    if (isRevoked) {
      return res.status(401).send("Token นี้ถูกยกเลิกแล้ว");
    }
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded.user; // ถ้า token ถูกต้อง ส่งข้อมูล user ไปต่อ

    // ตรวจสอบว่ามีข้อมูลผู้ใช้อยู่ในฐานข้อมูลหรือไม่
    const userInDB = await Token.findOne({ user: req.user });
    if (!userInDB) {
      return res.status(401).send("Token ไม่ถูกต้อง");
    }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).send("Token หมดอายุ");
    } else {
      return res.status(401).send("Token ไม่ถูกต้อง");
    }
  }
};

// ฟังก์ชันสำหรับสร้าง token ใหม่
const generateNewToken = async (user) => {
  const newToken = jwt.sign({ user: user }, secretKey, {
    expiresIn: "1h",
  });
  await Token.findOneAndUpdate(
    { user: user },
    { token: newToken },
    { upsert: true, new: true }
  );
  return newToken;
};

// ฟังก์ชันสำหรับสร้าง token ใหม่
const generateToken = (user) => {
  return jwt.sign({ user: user }, secretKey, {
    expiresIn: "1h",
  });
};

// ฟังก์ชันสำหรับ hash รหัสผ่าน
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10); // 10 เป็นค่า salt rounds
};

// Login Admin
router.post("/login", async (req, res) => {
  try {
    const { user, pass } = req.body;

    const result = await Token.findOne({ user: user });

    if (result) {
      // ตรวจสอบรหัสผ่าน
      const isPasswordValid = await bcrypt.compare(pass, result.pass);
      if (isPasswordValid) {
        // ลบ token เก่าและเพิ่มลงใน blacklist พร้อมตั้งเวลาหมดอายุ
        await RevokedToken.create({
          token: result.token,
          expiresAt: new Date(Date.now() + 3600 * 1000), // 1 ชั่วโมงจากตอนนี้
        });

        // สร้าง token ใหม่และอัปเดตในฐานข้อมูล
        const newToken = await generateNewToken(result.user);

        // ส่ง token ใหม่กลับไปใน header
        res.setHeader("Authorization", newToken);

        res.json({ isAdmin: true, token: newToken }); // ส่ง token กลับไปให้ admin
      } else {
        res.status(401).json({ isAdmin: false, message: "รหัสผ่านไม่ถูกต้อง" });
      }
    } else {
      res.status(401).json({ isAdmin: false, message: "ไม่พบผู้ใช้" });
    }
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการค้นหาในฐานข้อมูล:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบ" });
  }
});

// Add Admin (ต้องมีการตรวจสอบ token ก่อน)
router.post("/user", verifyToken, async (req, res) => {
  try {
    const { user, pass } = req.body;

    const tokenAdmin = req.headers["authorization"];
    const decoded = jwt.verify(tokenAdmin, secretKey);

    const findAdmin = await Token.findOne({ user: decoded.user });

    if (findAdmin.roles !== "admin") {
      return res
        .status(403)
        .json({ message: "คุณไม่มีสิทธิ์ในการเพิ่มผู้ใช้" });
    }

    // ตรวจสอบว่า user ซ้ำกันหรือไม่
    const existingEmail = await Token.findOne({ user: user });

    if (existingEmail) {
      return res.status(400).json({ message: "user นี้มีอยู่แล้วในระบบ" });
    }

    // Hash รหัสผ่านก่อนเก็บลงในฐานข้อมูล
    const hashedPassword = await hashPassword(pass);

    // สร้าง token และเก็บในฐานข้อมูล Token
    const token = generateToken(user);

    const createdUser = await Token.create({
      user,
      pass: hashedPassword,
      token: token,
    });

    // ลบ token เก่าและเพิ่มลงใน blacklist พร้อมตั้งเวลาหมดอายุ
    await RevokedToken.create({
      token: findAdmin.token,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 ชั่วโมงจากตอนนี้
    });

    // สร้าง token ใหม่และอัปเดตในฐานข้อมูล
    const newToken = await generateNewToken(decoded.user);

    // ส่ง token ใหม่กลับไปใน header
    res.setHeader("Authorization", newToken);

    res.json({ user: createdUser });
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการสร้าง user:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการสร้าง user" });
  }
});

// Delete email admin (ต้องมีการตรวจสอบ token ก่อน)
router.delete("/delete-user/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;

    const tokenAdmin = req.headers["authorization"];
    const decoded = jwt.verify(tokenAdmin, secretKey);

    const findAdmin = await Token.findOne({ user: decoded.user });
    if (findAdmin.roles !== "admin") {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์ในการลบผู้ใช้" });
    }
    const userDel = await Token.findById(userId);
    if (!userDel) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้ที่ต้องการลบ" });
    }
    await Token.findByIdAndDelete(userId);

    // ลบ token เก่าและเพิ่มลงใน blacklist พร้อมตั้งเวลาหมดอายุ
    await RevokedToken.create({
      token: findAdmin.token,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 ชั่วโมงจากตอนนี้
    });

    // สร้าง token ใหม่และอัปเดตในฐานข้อมูล
    const newToken = await generateNewToken(decoded.user);

    // ส่ง token ใหม่กลับไปใน header
    res.setHeader("Authorization", newToken);

    res.json({ message: "ลบผู้ใช้สำเร็จ" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบผู้ใช้" });
  }
});

// Update Admin (ต้องมีการตรวจสอบ token ก่อน)
router.put("/update-user/:id", verifyToken, async (req, res) => {
  try {
    const token = req.headers["authorization"];
    const decoded = jwt.verify(token, secretKey);

    const userId = req.params.id;
    // const _id = req.body._id;
    const updateform = {
      user: req.body.user,
      pass: req.body.pass,
      roles: req.body.roles,
      updatetime: new Date(),
    };

    if (updateform.roles) {
      if (updateform.roles !== "user" && updateform.roles !== "admin") {
        return res.status(400).json({
          message: "userstatus ต้องเป็น 'user' หรือ 'admin' เท่านั้น",
        });
      }
    }
    const userUpdater = await Token.findOne({ user: decoded.user });

    const existingUser = await Token.findOne({ user: updateform.user });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res
        .status(400)
        .json({ error: "ชื่อผู้ใช้ซ้ำกับผู้ใช้ที่มีอยู่แล้ว" });
    }

    // ตรวจสอบว่าผู้ใช้ที่ทำการอัปเดตเป็น admin หรือเป็นเจ้าของข้อมูลเอง
    if (
      userUpdater.roles !== "admin" &&
      userUpdater._id.toString() !== userId
    ) {
      return res.status(403).json({ error: "ไม่อนุญาตให้อัพเดตผู้ใช้อื่น" });
    }

    const hashedPassword = await bcrypt.hash(updateform.pass, 10);
    updateform.pass = hashedPassword;

    const userUpdate = await Token.findByIdAndUpdate(userId, updateform, {
      new: true,
    });

    // ลบ token เก่าและเพิ่มลงใน blacklist พร้อมตั้งเวลาหมดอายุ
    await RevokedToken.create({
      token: req.headers["authorization"],
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 ชั่วโมงจากตอนนี้
    });

    // สร้าง token ใหม่และอัปเดตในฐานข้อมูล
    const newToken = await generateNewToken(updateform.user);

    // ส่ง token ใหม่กลับไปใน header
    res.setHeader("Authorization", newToken);

    res.status(200).json(userUpdate);
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัพเดตผู้ใช้" });
  }
});

// Check user
router.get("/check-user", verifyToken, async (req, res) => {
  const user = req.query.user;

  const tokenAdmin = req.headers["authorization"];
  const decoded = jwt.verify(tokenAdmin, secretKey);

  const findAdmin = await Token.findOne({ user: decoded.user });
  if (findAdmin.roles !== "admin") {
    return res.status(403).json({ error: "คุณไม่มีสิทธิ์ในการตรวจสอบผู้ใช้" });
  }
  try {
    let users;
    if (user) {
      users = await Token.find({ user: user });
    } else {
      users = await Token.find();
    }

    // ลบ token เก่าและเพิ่มลงใน blacklist พร้อมตั้งเวลาหมดอายุ
    await RevokedToken.create({
      token: findAdmin.token,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 ชั่วโมงจากตอนนี้
    });

    // สร้าง token ใหม่และอัปเดตในฐานข้อมูล
    const newToken = await generateNewToken(decoded.user);

    // ส่ง token ใหม่กลับไปใน header
    res.setHeader("Authorization", newToken);

    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
