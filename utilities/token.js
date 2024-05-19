const Token = require("../models/Token");
const RevokedToken = require("../models/RevokedToken");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Load environment variables
dotenv.config();

// Use environment variable for secret key
const secretKey = process.env.JWT_SECRET;

const verifyToken = async (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).send("ไม่มี Token ในคำขอ");

  try {
    const isRevoked = await RevokedToken.findOne({ token: token });
    if (isRevoked) {
      return res.status(401).send("Token นี้ถูกยกเลิกแล้ว");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secretKey);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        // ตรวจสอบว่า token หมดอายุไม่เกิน 5 นาที
        decoded = jwt.decode(token);
        const currentTime = Math.floor(Date.now() / 1000);
        const expiredTime = decoded.exp;

        if (currentTime - expiredTime <= 300) {
          // 300 วินาที = 5 นาที
          req.user = decoded.user;
          const userInDB = await Token.findOne({ user: req.user });
          if (!userInDB) {
            return res.status(401).send("Token ไม่ถูกต้อง");
          }
          next();
          return;
        } else {
          return res.status(401).send("Token หมดอายุเกิน 5 นาที");
        }
      } else {
        return res.status(401).send("Token ไม่ถูกต้อง");
      }
    }

    req.user = decoded.user;

    const userInDB = await Token.findOne({ user: req.user });
    if (!userInDB) {
      return res.status(401).send("Token ไม่ถูกต้อง");
    }
    next();
  } catch (err) {
    return res.status(500).send("เกิดข้อผิดพลาดในเซิร์ฟเวอร์");
  }
};

// ฟังก์ชันสำหรับสร้าง token ใหม่
const generateNewToken = async (user, result) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ตรวจสอบ Token ปัจจุบัน
    const existingToken = await Token.findOne({ user: user });

    const fiveMinutesInMillis = 5 * 60 * 1000; // 5 นาทีในรูปแบบมิลลิวินาที

    // ถ้ามี Token ปัจจุบันและยังไม่หมดอายุภายใน 5 นาที
    if (
      existingToken &&
      existingToken.expiresAt > Date.now() + fiveMinutesInMillis
    ) {
      await session.endSession();
      return existingToken.token;
    }

    // ถ้าไม่มี Token ปัจจุบันหรือ Token หมดอายุแล้ว
    const newToken = jwt.sign({ user: user }, secretKey, {
      expiresIn: "1h",
    });

    const expiresAt = new Date(Date.now() + 3600 * 1000);

    await Token.findOneAndUpdate(
      { user: user },
      { token: newToken, expiresAt: expiresAt },
      { upsert: true, new: true, session: session }
    );

    // ลบ token เก่าและเพิ่มลงใน blacklist พร้อมตั้งเวลาหมดอายุ
    await RevokedToken.create({
      token: result.token,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 ชั่วโมงจากตอนนี้
    });

    await session.commitTransaction();
    session.endSession();

    return newToken;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
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

module.exports = { verifyToken, generateNewToken, generateToken, hashPassword };
